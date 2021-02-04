FROM node:15


RUN mkdir -p /usr/src/garie-plugin
RUN mkdir -p /usr/src/garie-plugin/reports

RUN curl -s https://api.github.com/repos/src-d/hercules/releases/latest \
    | grep "browser_download_url" \
    | grep linux \
    | cut -d '"' -f4 \
    | wget -qi - -O hercules.gz && \
    gzip -d hercules.gz && \
    chmod a+x hercules && \
    mv ./hercules /usr/local/bin


RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.5 \
    python3-dev \
    python3-pip \
    && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN pip3 install setuptools && \
    pip3 install Cython && \
    pip3 install numpy && \
    pip3 install wheel && \
    pip3 install labours

WORKDIR /usr/src/garie-plugin
COPY package.json .


RUN cd /usr/src/garie-plugin && npm install --prefer-online

RUN wget https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_amd64.deb && \
    dpkg -i dumb-init_*.deb

COPY . .

EXPOSE 3000

VOLUME ["/usr/src/garie-plugin/reports"]

ENTRYPOINT ["/usr/src/garie-plugin/docker-entrypoint.sh"]

CMD ["/usr/bin/dumb-init", "npm", "start"]
