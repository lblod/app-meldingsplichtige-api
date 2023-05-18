# Changelog
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
