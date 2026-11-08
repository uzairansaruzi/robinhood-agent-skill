FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --create-home --uid 10001 spybot && mkdir /app/var && chown spybot /app/var
COPY server ./server
COPY web ./web
USER spybot
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "uvicorn server.app:create_app --factory --host 0.0.0.0 --port ${PORT}"]
