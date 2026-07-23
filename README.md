# hotdog-bot
Hotdog Water Review Corps Bot Repo.

## Docker Compose (WIP)

- Create a directory and add a `docker-compose.yaml` file with the following contents:

```yaml
services:
  hotdog-bot:
    image: tobeadded
    restart: unless-stopped
    volumes:
      - ./discord-bot/data:/app/discord-bot/data
    environment:
      TOKEN: "add-discord-token-here"
```

- Create the following directory: `discord-bot/data` (will need to fix this later) and add the DB files to it.

- Your directory structure should look like this now:
```
hotdog-bot
├── docker-compose.yaml
└── discord-bot/
    └── data/
        ├── database files
```
- Run the container with `docker compose up -d`