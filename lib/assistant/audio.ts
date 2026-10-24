/** Standard PCM WAV duration is measured from validated frames; client duration headers are ignored. */
export function wavSeconds(bytes: Uint8Array) {
  const b = Buffer.from(bytes);
  if (
    b.length < 44 ||
    b.toString("ascii", 0, 4) !== "RIFF" ||
    b.toString("ascii", 8, 12) !== "WAVE" ||
    b.readUInt32LE(4) + 8 !== b.length
  )
    throw Error(
      "Verified-duration transcription requires a standard PCM WAV recording.",
    );
  let format = 0,
    channels = 0,
    rate = 0,
    byteRate = 0,
    bits = 0,
    align = 0,
    data = 0,
    formats = 0,
    dataChunks = 0,
    position = 12,
    chunks = 0;
  while (position + 8 <= b.length) {
    if (++chunks > 100) throw Error("Too many WAV chunks");
    const key = b.toString("ascii", position, position + 4),
      length = b.readUInt32LE(position + 4),
      start = position + 8;
    if (start + length > b.length) throw Error("Invalid WAV chunk length");
    if (key === "fmt ") {
      if (++formats !== 1 || length < 16) throw Error("Invalid WAV format");
      format = b.readUInt16LE(start);
      channels = b.readUInt16LE(start + 2);
      rate = b.readUInt32LE(start + 4);
      byteRate = b.readUInt32LE(start + 8);
      align = b.readUInt16LE(start + 12);
      bits = b.readUInt16LE(start + 14);
    }
    if (key === "data") {
      if (++dataChunks !== 1) throw Error("Use one standard PCM data stream");
      data = length;
    }
    position = start + length + (length % 2);
  }
  if (
    position !== b.length ||
    formats !== 1 ||
    dataChunks !== 1 ||
    format !== 1 ||
    ![1, 2].includes(channels) ||
    bits !== 16 ||
    rate < 8000 ||
    rate > 96000 ||
    align !== channels * 2 ||
    byteRate !== rate * align ||
    !data ||
    data % align
  )
    throw Error("Use a standard 16-bit PCM WAV recording.");
  return Math.ceil(data / byteRate);
}
