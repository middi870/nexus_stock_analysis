FROM python:3.11-slim

WORKDIR /app

# system deps
RUN apt-get update && apt-get install -y gcc

# install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy code
COPY . .

# run app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
