    # nodered.Dockerfile

    # Usa a imagem oficial do Node-RED como base
    FROM nodered/node-red

    # Instala o nó node-red-contrib-axios
    # Não precisa de WORKDIR /data ou --prefix .
    # O npm do Node-RED já sabe onde instalar os módulos para que sejam encontrados.
    RUN npm install node-red-contrib-axios --unsafe-perm

    # Define explicitamente o ENTRYPOINT para iniciar o Node-RED
    # Isso garante que o comando padrão da imagem base seja sobrescrito de forma robusta.
    ENTRYPOINT ["npm", "start", "--", "--userDir", "/data"]
    