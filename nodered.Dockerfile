FROM nodered/node-red

    # Define o diretório de trabalho onde o Node-RED armazena seus dados e módulos
    WORKDIR /data

    # Instala o nó node-red-contrib-axios
    RUN npm install --prefix . node-red-contrib-axios --unsafe-perm


    