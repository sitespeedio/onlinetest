import { Router } from 'express';
import bodyParser from 'body-parser';
import { getLogger } from '@sitespeed.io/log';

import { validateURL } from '../../middleware/validateurl.js';
import { validateQueue } from '../../middleware/validatequeue.js';
import { addTest } from '../../util/add-test.js';
import {
  getSlackConfig,
  isValidSlackSignature,
  parseCommand,
  usage,
  rememberResponseUrl
} from '../../util/slack.js';

const { urlencoded } = bodyParser;
const logger = getLogger('sitespeedio.server.slack');

export const slack = Router();

function reply(response, text, inChannel = false) {
  // Slack shows the reply only when the status is 200.
  return response.json({
    response_type: inChannel ? 'in_channel' : 'ephemeral',
    text
  });
}

slack.post(
  '/command',
  // The signature is calculated on the raw body, so keep it.
  urlencoded({
    extended: false,
    verify: (request, response, buffer) => {
      request.rawBody = buffer.toString('utf8');
    }
  }),
  (request, response, next) => {
    const config = getSlackConfig();
    if (
      !isValidSlackSignature(
        config.signingSecret,
        request.get('x-slack-request-timestamp'),
        request.get('x-slack-signature'),
        request.rawBody
      )
    ) {
      logger.info('Invalid Slack signature');
      return response.status(401).send('Invalid signature');
    }
    const { channel_id, text, command } = request.body;
    if (
      config.allowedChannels.length > 0 &&
      !config.allowedChannels.includes(channel_id)
    ) {
      return reply(response, 'Tests cannot be added from this channel.');
    }
    const parsed = parseCommand(text);
    if (parsed.error) {
      return reply(response, `${parsed.error}\n${usage(command)}`);
    }
    request.slackCommand = parsed;
    request.slackResponseUrl = request.body.response_url;
    request.slackUser = request.body.user_name;
    // Use the same input as the GUI, so the same validation applies.
    request.body = {
      url: parsed.url,
      location: config.location,
      browser: parsed.browser,
      testType: parsed.testType,
      iterations: parsed.iterations,
      connectivity: config.connectivity,
      label: config.label,
      extras: parsed.replay ? '--webpagereplay' : undefined
    };
    next();
  },
  validateURL,
  // validateQueue overwrites the error, so stop here like the GUI does.
  (request, response, next) =>
    request.inputValidationError
      ? reply(response, request.inputValidationError)
      : next(),
  validateQueue,
  async function (request, response) {
    if (request.inputValidationError) {
      return reply(response, request.inputValidationError);
    }
    try {
      const id = await addTest(request);
      rememberResponseUrl(id, request.slackResponseUrl);
      logger.info(
        'New URL %s with id %s from Slack user %s',
        request.body.url,
        id,
        request.slackUser
      );
      const { serverUrl } = getSlackConfig();
      const link = serverUrl
        ? ` ${serverUrl.replace(/\/$/, '')}/result/${id}`
        : '';
      const { browser, iterations, replay, testType } = request.slackCommand;
      return reply(
        response,
        `Testing ${request.body.url} (${browser}, ${testType}, ${iterations} run(s)${replay ? ', WebPageReplay' : ''}). I will post the result here.${link}`,
        true
      );
    } catch (error) {
      logger.error('Could not add test from Slack', error);
      return reply(response, 'Could not add the test, please try again.');
    }
  }
);
