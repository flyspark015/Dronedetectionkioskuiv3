package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/protomaps/go-pmtiles/pmtiles"
)

func usage() {
	fmt.Fprintf(os.Stderr, "Usage:\n  pmtiles extract <input> <output> [--bbox=minlon,minlat,maxlon,maxlat] [--minzoom=N] [--maxzoom=N] [--download-threads=N]\n")
}

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}
	switch os.Args[1] {
	case "extract":
		runExtract(os.Args[2:])
	default:
		usage()
		os.Exit(2)
	}
}

func runExtract(args []string) {
	fs := flag.NewFlagSet("extract", flag.ExitOnError)
	bbox := fs.String("bbox", "", "bbox minlon,minlat,maxlon,maxlat")
	minzoom := fs.Int("minzoom", -1, "min zoom")
	maxzoom := fs.Int("maxzoom", -1, "max zoom")
	downloadThreads := fs.Int("download-threads", 4, "download threads")
	overfetch := fs.Float64("overfetch", 0.05, "overfetch ratio")
	dryRun := fs.Bool("dry-run", false, "dry run")
	fs.Parse(args)

	pos := fs.Args()
	if len(pos) < 2 {
		usage()
		os.Exit(2)
	}

	input := pos[0]
	output := pos[1]

	logger := log.New(os.Stdout, "", log.Ldate|log.Ltime)
	if err := pmtiles.Extract(logger, "", input, int8(*minzoom), int8(*maxzoom), "", *bbox, output, *downloadThreads, float32(*overfetch), *dryRun); err != nil {
		logger.Fatalf("Failed to extract: %v", err)
	}
}
