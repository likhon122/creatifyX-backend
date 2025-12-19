# Vercel Deployment Configuration

## Required Environment Variables

Make sure to set these environment variables in your Vercel project settings:

```
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
FRONTEND_URL=your_frontend_url
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_SUCCESS_URL=your_success_url
STRIPE_CANCEL_URL=your_cancel_url
STRIPE_WEBHOOK_SECRET=your_webhook_secret
BCRYPT_SALT_ROUNDS=10
JWT_SECRET_KEY=your_jwt_secret
MAIL_EMAIL=your_email
MAIL_PASSWORD=your_email_password
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=your_admin_password
```

## Deployment Steps

1. Push your code to GitHub
2. Import the project in Vercel
3. Set the root directory to `backend`
4. Add all environment variables
5. Deploy

## Important Notes

- The API endpoint will be available at your Vercel domain
- All routes are prefixed with `/api/v1`
- Make sure MongoDB connection string allows connections from Vercel IPs (0.0.0.0/0)
