import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'SafeRide PU API Documentation',
    version: '1.0.0',
    description: 'API contracts and services documentation for SafeRide PU safe transit system.',
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        description: 'Returns health diagnostics of database connectivity, server, and configurations.',
        responses: {
          200: {
            description: 'Database and server are healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'System is healthy' },
                    data: {
                      type: 'object',
                      properties: {
                        uptime: { type: 'number', example: 12.34 },
                        dbState: { type: 'string', example: 'connected' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
