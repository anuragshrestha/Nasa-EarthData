#!/bin/bash
set -euo pipefail
GREP_OPTIONS=''

cookiejar=$(mktemp cookies.XXXXXXXXXX)
netrc=$(mktemp netrc.XXXXXXXXXX)
chmod 0600 "$cookiejar" "$netrc"
cleanup() { rm -rf "$cookiejar" "$netrc"; }
trap cleanup EXIT

prompt_credentials() {
  echo "Enter your Earthdata Login or other provider supplied credentials"
  read -p "Username: " username
  read -s -p "Password: " password; echo
  printf "machine urs.earthdata.nasa.gov login %s password %s\n" "$username" "$password" >> "$netrc"
}

exit_with_error() {
  echo; echo "Unable to Retrieve Data"; echo
  echo "$1"; echo; exit 1
}

approve_url="https://data.gesdisc.earthdata.nasa.gov/data/Aqua_AIRS_NRT/AIRS2RET_NRT.7.0/2025/278/AIRS.2025.10.05.104.L2.RetStd_IR.v7.0.9.3.R25278080236.hdf"

detect_app_approval() {
  approved=$(curl -s -b "$cookiejar" -c "$cookiejar" -L --max-redirs 5 --netrc-file "$netrc" "$approve_url" -w '\n%{http_code}' | tail -1)
  if [ "$approved" -ne 200 ] && [ "$approved" -ne 301 ] && [ "$approved" -ne 302 ]; then
    exit_with_error "Please authorize access in Earthdata (open the dataset URL in a browser while logged in)."
  fi
}

setup_auth_curl() {
  status=$(curl -s -z "$(date)" -w '\n%{http_code}' "$approve_url" | tail -1)
  if [ "$status" -ne 200 ] && [ "$status" -ne 304 ]; then
    detect_app_approval
  fi
}

setup_auth_wget() {
  touch ~/.netrc && chmod 0600 ~/.netrc
  if ! grep -q 'machine urs.earthdata.nasa.gov' ~/.netrc 2>/dev/null; then
    cat "$netrc" >> ~/.netrc
  fi
}

fetch_urls() {
  if command -v curl >/dev/null 2>&1; then
    setup_auth_curl
    while read -r line; do
      [ -z "$line" ] && continue
      filename="${line##*/}"
      out="${filename%%\?*}"
      echo "Downloading: $out"
      curl -f -b "$cookiejar" -c "$cookiejar" -L --netrc-file "$netrc" -g -o "$out" -- "$line" \
        || exit_with_error "curl failed for $line"
    done
  elif command -v wget >/dev/null 2>&1; then
    echo "Using wget"
    setup_auth_wget
    while read -r line; do
      [ -z "$line" ] && continue
      filename="${line##*/}"
      out="${filename%%\?*}"
      echo "Downloading: $out"
      wget --load-cookies "$cookiejar" --save-cookies "$cookiejar" --keep-session-cookies \
        --output-document "$out" -- "$line" \
        || exit_with_error "wget failed for $line"
    done
  else
    exit_with_error "Install curl or wget and try again."
  fi
}

prompt_credentials

# Prefer urls.txt if present; otherwise read from stdin
if [ -t 0 ]; then
  if [ -f urls.txt ]; then
    fetch_urls < urls.txt
  else
    echo "No urls.txt and no piped input. Create urls.txt or pipe URLs in."
    exit 2
  fi
else
  fetch_urls
fi


