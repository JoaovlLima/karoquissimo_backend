import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required().messages({
    'any.required': 'DATABASE_URL is a critical configuration and is missing from .env',
  }),
  FRONTEND_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required().messages({
    'any.required': 'FRONTEND_URL is required to configure secure CORS settings',
    'string.uri': 'FRONTEND_URL must be a valid HTTP or HTTPS URL',
  }),
  JWT_SECRET: Joi.string().required().messages({
    'any.required': 'JWT_SECRET is required to secure authentication tokens',
  }),
  JWT_EXPIRES_IN: Joi.string().default('8h'),
});
