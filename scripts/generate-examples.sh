#!/bin/bash
set -e

cd "$(dirname "$0")/.."
npm run build:all

for diagram in flowchart sequence; do
  for theme in dark light; do
    echo -n "Generating ${diagram}-${theme}.gif..."
    node dist/cli.js "scripts/diagrams/${diagram}.mmd" \
      -o "examples/${diagram}-${theme}.gif" -t "$theme"
    echo " done"
  done
done
