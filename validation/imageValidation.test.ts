import { bufferMatchesImageSignature, sanitizeFilename } from './imageValidation';

describe('bufferMatchesImageSignature', () => {
  it('accepts a real JPEG signature', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(bufferMatchesImageSignature(buf)).toBe(true);
  });

  it('accepts a real PNG signature', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(bufferMatchesImageSignature(buf)).toBe(true);
  });

  it('accepts a real WEBP signature', () => {
    const buf = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0, 0, 0, 0]), // file size field, irrelevant to the check
      Buffer.from('WEBP', 'ascii'),
    ]);
    expect(bufferMatchesImageSignature(buf)).toBe(true);
  });

  it('rejects a file with a spoofed .jpg name but non-image content', () => {
    const buf = Buffer.from('#!/bin/sh\necho not an image', 'ascii');
    expect(bufferMatchesImageSignature(buf)).toBe(false);
  });

  it('rejects an empty buffer', () => {
    expect(bufferMatchesImageSignature(Buffer.alloc(0))).toBe(false);
  });
});

describe('sanitizeFilename', () => {
  it('strips directory traversal segments', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
  });

  it('replaces unsafe characters', () => {
    expect(sanitizeFilename('my photo!.jpg')).toBe('my_photo_.jpg');
  });

  it('leaves a normal filename untouched', () => {
    expect(sanitizeFilename('dog.jpg')).toBe('dog.jpg');
  });
});
