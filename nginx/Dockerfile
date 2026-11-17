# ==============================================================================
# Production Nginx Reverse Proxy for CreatifyX Backend
# ==============================================================================
FROM nginx:1.27-alpine

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Remove default boilerplate configurations
RUN rm -f /etc/nginx/conf.d/default.conf /etc/nginx/nginx.conf

# Copy hardened custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
