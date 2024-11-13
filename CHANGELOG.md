# Changelog
## 1.40.3 (2024-11-13
- update forms [DL-5977] -> "Toezicht: make form "Besluit APB over retributies" available for AGB"
## 1.40.2 (2024-11-13)
 - bugfix: forgot to add form
## 1.40.1 (2024-11-13)
### Toezicht
 - Update URI form "Aangewezen Burgemeester" [DL-6298]

### Deploy notes
```
drc restart migrations; drc up -d enrich-submission
```

## 1.40.0 (2024-10-09)

- New `enrich-submission-service` v1.12.1
- New semantic form file (DL-5930)

## 1.39.1 (2024-05-29)
  - Fix custom info label field in forms LEKP-rapport - Melding correctie authentieke bron and LEKP-rapport - Toelichting Lokaal Bestuur (DL-5934)
### Deploy Notes
  - `drc up -d enrich-submission; drc restart migrations resource cache`
## 1.39.0 (2024-05-16)

### General
- Update forms
  - Adjust LEKP rapport Klimaattafels (DL-5832)
  - Add new LEKP rapport Wijkverbeteringscontract (DL-5829)

### Deploy Notes
- `drc up -d enrich-submission; drc restart migrations resource cache`
## 1.38.0 (2024-03-14)
- Update forms
  - Adding new form Aanduiding en eedaflegging van de aangewezen burgemeester (DL-5669)
  - Adding new form Strandconcessies - reddingsdiensten kustgemeenten (DL-5625)
  - Adding new form Melding onvolledigheid inzending eredienstbestuur (DL-5643)
  - Adding new form Opstart beroepsprocedure naar aanleiding van een beslissing + Codelist (DL-5646)
  - Adding informational text to forms to minimize usage of the wrong forms (DL-5665)
  - Adding new form Afschrift erkenningszoekende besturen + Codelist (DL-5670)
### Deploy instructions
- drc up -d enrich-submission; drc restart migrations resource cache
## 1.37.0 (2024-01-12)
- Update forms
    - New forms LEKP Collectieve Energiebesparende Renovatie, Fietspaden, Sloopbeleidsplan
    - New forms Niet-bindend advies op statuten and Niet-bindend advies op oprichting
    - Change form LEKP Melding correctie authentieke bron, removed field "type correctie"
### Deploy instructions
- drc up -d enrich-submission; drc restart migrations resource cache
## 1.36.0 (2023-11-27)
- Adding missing data for besluitTypes and BesluitDocumentTypes
- Adjusting label for "Budgetten(wijzigingen) van besturen van de eredienst"
### deploy instructions
- drc restart migrations resource cache
## 1.35.0 (2023-11-15)
- update forms
### deploy instructions
- drc up -d enrich-submission; drc restart migrations resource cache
## 1.34.0 (2023-10-17)
- bump mu-identifier
- update forms
### deploy instructions
- drc up -d; drc restart migrations
## 1.33.0 (2023-09-18)
- release some upgraded versions of services
## 1.29.0 (2023-06-30)
- update forms
## 1.28.0 (2023-05-18)
- fix vendor api + migration to correct issues
- import submission bump
### deploy instructions
```
drc up -d; drc restart migrations
```
## 1.27.0 (2023-04-24)
- update forms
## 1.26.3 (2023-04-08)
  - Bump automatic-submission
  - Adjusted schorsing beslissing eredienstbesturen form for deputatie
## 1.26.2 (2023-02-22)
  - Bump automatic-submission, which should have been
    included in 1.26.0
## 1.26.1 (2023-02-20)
 - Bump the same services as previous release to solve a common issue with
   failing builds because of an incompatibility with the `env-var` library and
   an old JavaScript template.
# 1.26.0 (2023-02-14)
 - Multiple service update related to automatic-submission
   for correct exposure of data
## 1.25.0 (2023-02-08)
 - update forms
## 1.24.1 (2023-01-25)
 - update access vendor RO
## 1.24.0 (2023-01-25)
- syncing forms and data to be in sync with loket (prepare erediensten)
## 1.23.1 (2023-01-11)
- bugfix on remove submissions since introduction of vendor-api
- cleanup dangling submissions
## 1.23.0 (2022-12-12)
- converted automatic submission model to cogs:Job
- experimental support vendor sparql endpoint
## 1.22.0 (2022-11-08)
- added erediensten data
## 1.21.0 (2022-11-08)
- added new forms
## 1.20.0 (2022-10-20)
- added new forms
## 1.19.0 (2022-10-03)
- Move pipeline to cogs:Job model
- added dashboard. (Mainly for testing purposes in this app)
