import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nurkhonov Academy API',
      version: '1.0.0',
      description: 'API документация для платформы Nurkhonov Academy - бизнес-платформа для обучения финансам, предпринимательству и профессиональным навыкам',
      contact: {
        name: 'API Support',
        email: 'support@nurkhonov.academy',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Paths to files containing OpenAPI definitions
};

export const swaggerSpec = swaggerJsdoc(options);
