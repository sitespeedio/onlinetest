/* eslint-disable unicorn/no-thenable */
/* eslint-disable unicorn/no-null */
import Joi from 'joi';

// Setup schema for different device types
const setupSchema = Joi.array().items(
  Joi.object({
    name: Joi.string().required(),
    hostname: Joi.string().optional(),
    type: Joi.string().valid('desktop', 'emulatedMobile', 'android').required(),
    browsers: Joi.array()
      .items(Joi.string().valid('chrome', 'firefox', 'edge', 'safari'))
      .required(),
    connectivity: Joi.array().items(Joi.string()).required(),
    useDocker: Joi.boolean()
      .required()
      .when('type', {
        is: Joi.string().valid('desktop', 'emulatedMobile'),
        then: Joi.required()
      }),
    queue: Joi.string().optional(),
    model: Joi.string().when('type', { is: 'android', then: Joi.required() }),
    deviceId: Joi.string()
      .when('type', { is: 'android', then: Joi.required() })
      .messages({
        'any.required': `You need to configure the deviceId for your Android phone. You can see the id by running adb devices`
      })
  })
);

// Location schema
const locationSchema = Joi.object({
  name: Joi.string().required(),
  setup: setupSchema.required()
});

const queueSchema = Joi.object({
  removeOnComplete: Joi.number().allow(null).optional(),
  removeOnFail: Joi.number().allow(null).optional()
});

// Redis schema
const redisSchema = Joi.object({
  port: Joi.number().allow(null),
  host: Joi.string().allow(null),
  password: Joi.string().allow(null),
  tls: Joi.boolean().allow(null).optional()
});

// Logging schema
const loggingSchema = Joi.object({
  verbose: Joi.boolean().allow(null)
});

// Docker schema
const dockerSchema = Joi.object({
  container: Joi.string().optional(),
  extraparameters: Joi.string().allow(null).optional(),
  baselinedir: Joi.string().allow(null).optional()
})
  .optional()
  .allow(null);

// Complete config schema
const configSchema = Joi.object({
  location: locationSchema.required(),
  redis: redisSchema.required(),
  log: loggingSchema.required(),
  sitespeedioConfigFile: Joi.string().optional(),
  workingDirectory: Joi.string().optional(),
  executable: Joi.string().required(),
  docker: dockerSchema.required(),
  queue: queueSchema.optional(),
  'sitespeed.io': Joi.object().optional().unknown(true)
});

export function validate(config) {
  const { error } = configSchema.validate(config);
  if (error) {
    console.error(
      'The configuration includes errors:',
      error.details.map(error_ => error_.message)
    );
    console.log('Your configuration:');
    console.log(JSON.stringify(config, undefined, 2));
    throw error;
  }
}
