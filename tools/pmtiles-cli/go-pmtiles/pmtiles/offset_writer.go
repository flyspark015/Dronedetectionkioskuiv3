package pmtiles

import "io"

type offsetWriter struct {
	w   io.WriterAt
	off int64
}

func newOffsetWriter(w io.WriterAt, off int64) io.Writer {
	return &offsetWriter{w: w, off: off}
}

func (o *offsetWriter) Write(p []byte) (int, error) {
	n, err := o.w.WriteAt(p, o.off)
	o.off += int64(n)
	return n, err
}
