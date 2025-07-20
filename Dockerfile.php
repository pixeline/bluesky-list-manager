# Use official PHP image with Apache
FROM php:8.2-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install curl

# Enable Apache modules
RUN a2enmod rewrite

# Set the working directory
WORKDIR /var/www/html

# Copy application files
COPY index.php /var/www/html/
COPY app.js /var/www/html/
COPY styles.css /var/www/html/
COPY .env.example /var/www/html/

# Create data directory for any persistent storage
RUN mkdir -p /var/www/html/data && \
    chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Configure Apache
RUN echo '<VirtualHost *:80>\n\
    DocumentRoot /var/www/html\n\
    DirectoryIndex index.php\n\
    <Directory /var/www/html>\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
    ErrorLog ${APACHE_LOG_DIR}/error.log\n\
    CustomLog ${APACHE_LOG_DIR}/access.log combined\n\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

# Expose port 80
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]