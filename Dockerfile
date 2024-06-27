# Use Ubuntu 20.04 as the base image
FROM ubuntu:20.04
ENV DEBIAN_FRONTEND noninteractive

# Set the working directory inside the container
WORKDIR /app

# Install necessary tools and dependencies
RUN apt-get update && apt-get install -y \
    curl \
    npm \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https \
    xvfb \
    && curl -sL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get update && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] https://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Command to run the application
# CMD ["node", "-v"]
CMD ["node", "journeys/register.js"]
