"""Normalize PNG colour metadata after AppKit export; never change pixel data.
Run after repair-colour-symbols.swift. CoreGraphics DeviceRGB may export a 2.2
gAMA value instead of the PNG sRGB encoding gamma, which Chrome reads as pale.
"""
import struct,zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
IDS={3:'empress',5:'hierophant',6:'lovers',7:'chariot',10:'wheel-of-fortune',14:'temperance',16:'tower',18:'moon'}
def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
def normalize(path):
 data=path.read_bytes();pos=8;out=data[:8]
 while pos<len(data):
  n=struct.unpack('>I',data[pos:pos+4])[0];kind=data[pos+4:pos+8];payload=data[pos+8:pos+8+n];raw=data[pos:pos+n+12];pos+=n+12
  if kind in (b'gAMA',b'sRGB',b'iCCP',b'cHRM'):continue
  out+=raw
  if kind==b'IHDR':out+=chunk(b'sRGB',b'\0')+chunk(b'gAMA',struct.pack('>I',45455))
 path.write_bytes(out)
for n,id in IDS.items():
 for suffix in ['colour','preview']+(['ink-transparent'] if n==18 else []):
  normalize(ROOT/f'docs/tarot-sunburst/light-paint/{n:02d}-{id}-{suffix}.png')
print('Normalized sRGB metadata; compressed IDAT pixel bytes unchanged.')
