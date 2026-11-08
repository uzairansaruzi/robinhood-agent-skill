#!/usr/bin/env python3
"""Fetch licensed historical stock OHLC. No broker/trading endpoints."""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--symbol', choices=['SPY', 'QQQ', 'both'], default='both')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'dist' / 'data')
    args = parser.parse_args()
    key, secret = os.environ.get('APCA_API_KEY_ID'), os.environ.get('APCA_API_SECRET_KEY')
    if not key or not secret:
        parser.error('Set APCA_API_KEY_ID and APCA_API_SECRET_KEY in the local environment.')
    args.output.mkdir(parents=True, exist_ok=True)
    for ticker in (['SPY', 'QQQ'] if args.symbol == 'both' else [args.symbol]):
        for month in range(4, 12):
            start = f'2026-{month:02d}-01T00:00:00Z'
            end = '2026-11-07T00:00:00Z' if month == 11 else f'2026-{month+1:02d}-01T00:00:00Z'
            rows, page_token = [], None
            while True:
                query = dict(start=start, end=end, timeframe='1Min', feed='sip', adjustment='raw', limit=10000, sort='asc')
                if page_token:
                    query['page_token'] = page_token
                request = Request('https://data.alpaca.markets/v2/stocks/' + ticker + '/bars?' + urlencode(query), headers={'APCA-API-KEY-ID': key, 'APCA-API-SECRET-KEY': secret})
                try:
                    with urlopen(request, timeout=45) as response:
                        payload = json.load(response)
                except HTTPError as exc:
                    raise SystemExit(f'Provider returned HTTP {exc.code}; verify historical SIP entitlement and limits.') from None
                for b in payload.get('bars', []):
                    timestamp = dt.datetime.fromisoformat(b['t'].replace('Z', '+00:00'))
                    eastern = timestamp.astimezone(ZoneInfo('America/New_York'))
                    minute = eastern.hour * 60 + eastern.minute
                    if 570 <= minute < 960:
                        rows.append([b['t'], b['o'], b['h'], b['l'], b['c']])
                next_token = payload.get('next_page_token')
                if not next_token:
                    break
                if next_token == page_token:
                    raise SystemExit('Provider pagination stalled.')
                page_token = next_token
            output = dict(ticker=ticker, source='Alpaca SIP historical REST (owner licensed)', feed='sip', timeframe='1Min', adjustment='raw', retrieved=dt.datetime.now(dt.timezone.utc).isoformat(), requestedStart=start, requestedEnd=end, bars=rows)
            path = args.output / f'{ticker}-{month}.json'
            path.write_text(json.dumps(output, separators=(',', ':')) + '\n')
            print(f'{path.name}: {len(rows)} regular-session bars')

if __name__ == '__main__':
    main()
