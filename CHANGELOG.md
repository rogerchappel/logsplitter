# Changelog

All notable changes to this project will be documented in this file.

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and uses semantic versioning when versioned releases are published.

## [Unreleased]

### Added

- Initial project setup.

### Fixed

- Compare repeated packet fingerprints by occurrence instead of treating every
  duplicate as unchanged.
- Ignore zero-count test summary phrases such as `0 failed` and `0 failing`
  while continuing to classify positive failure counts and diagnostics.

## Release Links

- Unreleased:
  `https://github.com/rogerchappel/logsplitter/compare/...HEAD`
- Latest release:
  `https://github.com/rogerchappel/logsplitter/releases/latest`

Replace placeholder links once the first release tag exists.
