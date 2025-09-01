#!/bin/bash
set -e

CYAN="\033[1;36m"
NC="\033[0m"

copy_default_config() {
  echo "Checking configuration directory..."
  if [ ! -d "/app/config" ]; then
    mkdir -p /app/config
  fi

  echo "Checking if default config files need to be copied..."
  files_copied=false

  for file in /app/default/*; do
    filename=$(basename "$file")
    target="/app/config/$filename"

    if [ ! -e "$target" ]; then
      echo "Copying default config file: $filename"
      cp -r "$file" "$target"
      files_copied=true
    fi
  done

  if [ "$files_copied" = true ]; then
    echo "Default configuration files copied successfully."
  else
    echo "No default files needed to be copied."
  fi
}


start_server() {
  # Clean up old FIFOs
  [ -p /tmp/build_logs_fifo ] && rm /tmp/build_logs_fifo
  [ -p /tmp/build_logs_fifo2 ] && rm /tmp/build_logs_fifo2

  mkfifo /tmp/build_logs_fifo
  mkfifo /tmp/build_logs_fifo2

  cat /tmp/build_logs_fifo >&2 &
  cat /tmp/build_logs_fifo2 >&2 &

  PREVIEW_PORT="${PREVIEW_PORT:-3000}"
  echo "Starting preview HTTP server on port 3000..."
  echo "Preview host port is set to: ${PREVIEW_PORT}"
  python3 -u -m http.server 3000 -d /app/output &
  SERVER_PID=$!

  echo "Starting Lumeex Flask webui..."
  python3 -u -m src.py.webui.webui &
  WEBUI_PID=$!

  trap "echo 'Stopping servers...'; kill -TERM $SERVER_PID $WEBUI_PID 2>/dev/null; wait $SERVER_PID $WEBUI_PID; exit 0" SIGINT SIGTERM

  wait $SERVER_PID
  wait $WEBUI_PID
}

VERSION=$(cat VERSION)
if [ $# -eq 0 ]; then
  echo -e "${CYAN}╭───────────────────────────────────────────╮${NC}"
  echo -e "${CYAN}│${NC}          Lum${CYAN}eex${NC} - Version ${VERSION}${NC}           ${CYAN}│${NC}"
  echo -e "${CYAN}├───────────────────────────────────────────┤${NC}"
  echo -e "${CYAN}│${NC} Source: https://git.djeex.fr/Djeex/lumeex ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC} Mirror: https://github.com/Djeex/lumeex   ${CYAN}│${NC}"
  echo -e "${CYAN}│${NC} Documentation: https://lumeex.djeex.fr    ${CYAN}│${NC}"
  echo -e "${CYAN}╰───────────────────────────────────────────╯${NC}"
  copy_default_config
  start_server
fi

case "$1" in
  build)
    echo "Running build.py..."
    python3 -u /app/build.py 2>&1 | tee /tmp/build_logs_fifo
    ;;
  gallery)
    echo "Running gallery.py..."
    python3 -u /app/gallery.py 2>&1 | tee /tmp/build_logs_fifo2
    ;;
  *)
    echo "Unknown command: $1"
    exec "$@"
    ;;
esac
