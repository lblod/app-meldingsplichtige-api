defmodule Dispatcher do
  use Matcher
  define_accept_types []

  # In order to forward the 'themes' resource to the
  # resource service, use the following forward rule.
  #
  # docker-compose stop; docker-compose rm; docker-compose up
  # after altering this file.
  #
  # match "/themes/*path" do
  #   forward conn, path, "http://resource/themes/"
  # end

  match "/bestuurseenheden/*path" do
    forward conn, path, "http://cache/bestuurseenheden/"
  end
  match "/bestuurseenheid-classificatie-codes/*path" do
    forward conn, path, "http://cache/bestuurseenheid-classificatie-codes/"
  end
  match "/bestuursorganen/*path" do
    forward conn, path, "http://cache/bestuursorganen/"
  end
  match "/bestuursorgaan-classificatie-codes/*path" do
    forward conn, path, "http://cache/bestuursorgaan-classificatie-codes/"
  end
  match "/agendapunten/*path" do
    forward conn, path, "http://cache/agendapunten/"
  end
  match "/behandelingen-van-agendapunten/*path" do
    forward conn, path, "http://cache/behandelingen-van-agendapunten/"
  end
  match "/zittingen/*path" do
    forward conn, path, "http://cache/zittingen/"
  end
  match "/remote-data-objects/*path" do
    forward conn, path, "http://cache/remote-data-objects/"
  end
  get "/files/:id/download" do
    forward conn, [], "http://file/files/" <> id <> "/download"
  end
  get "/files/*path" do
    forward conn, path, "http://cache/files/"
  end
  patch "/files/*path" do
    forward conn, path, "http://cache/files/"
  end
  post "/files/*path" do
    forward conn, path, "http://file/files/"
  end
  post "/file-service/files/*path" do
    forward conn, path, "http://file/files/"
  end
  delete "/files/*path" do
    forward conn, path, "http://file/files/"
  end

  match "/mock/sessions/*path" do
    forward conn, path, "http://mocklogin/sessions/"
  end
  match "/sessions/*path" do
    forward conn, path, "http://login/sessions/"
  end
  match "/gebruikers/*path" do
    forward conn, path, "http://cache/gebruikers/"
  end
  match "/accounts/*path" do
    forward conn, path, "http://cache/accounts/"
  end
  delete "/submissions/*path" do
    forward conn, path, "http://clean-up-submission/submissions/"
  end
  put "/submissions/*path" do
    forward conn, path, "http://cache/submissions/"
  end
  patch "/submissions/*path" do
    forward conn, path, "http://cache/submissions/"
  end
  post "/submissions/*path" do
    forward conn, path, "http://cache/submissions/"
  end
  get "/submissions/*path" do
    forward conn, path, "http://cache/submissions/"
  end
  match "/vendors/*path" do
    forward conn, path, "http://cache/vendors/"
  end
  match "/authenticity-types/*path" do
    forward conn, path, "http://cache/authenticity-types/"
  end
  match "/tax-types/*path" do
    forward conn, path, "http://cache/tax-types/"
  end
  match "/tax-rates/*path" do
    forward conn, path, "http://cache/tax-rates/"
  end
  match "/chart-of-accounts/*path" do
    forward conn, path, "http://cache/chart-of-accounts/"
  end
  match "/submission-document-statuses/*path" do
    forward conn, path, "http://cache/submission-document-statuses/"
  end

  match "/remote-urls/*path" do
    forward conn, path, "http://cache/remote-urls/"
  end

  #################################################################
  # Resources for Jobs and their metadata
  #################################################################

  match "/tasks/*path" do
    forward conn, path, "http://cache/tasks/"
  end

  match "/services/*path" do
    forward conn, path, "http://cache/services/"
  end

  match "/statusses/*path" do
    forward conn, path, "http://cache/statusses/"
  end

  match "/operations/*path" do
    forward conn, path, "http://cache/operations/"
  end

  match "/job-errors/*path" do
    forward conn, path, "http://cache/job-errors/"
  end

  match "/data-containers/*path" do
    forward conn, path, "http://cache/data-containers/"
  end

  #################################################################
  # Dashboard routes
  #################################################################
  # Jobs
  match "/jobs/*path" do
    forward conn, path, "http://cache/jobs/"
  end

  # Reports
  match "/reports/*path" do
    forward conn, path, "http://cache/reports/"
  end

  # Logs
  match "/log-entries/*path" do
    forward conn, path, "http://cache/log-entries/"
  end

  match "/log-levels/*path" do
    forward conn, path, "http://cache/log-levels/"
  end

  match "/status-codes/*path" do
    forward conn, path, "http://cache/status-codes/"
  end

  match "/log-sources/*path" do
    forward conn, path, "http://cache/log-sources/"
  end

  match "/status-codes/*path" do
    forward conn, path, "http://cache/acm-idm-service-log-entries/"
  end

  # Jobs
  match "/jobs/*path" do
    forward conn, path, "http://cache/jobs/"
  end

  #################################################################
  # automatic submission
  #################################################################

  post "/melding/*path" do
    forward conn, path, "http://automatic-submission/melding"
  end

  post "/delete-melding" do
    forward conn, [], "http://clean-up-submission/delete-melding"
  end

  #################################################################
  # verify submission (to be removed)
  #################################################################

  get "/verify/bestuurseenheid/*path" do
    forward conn, path, "http://verify-submission/bestuurseenheid"
  end

  get "/verify/inzending/*path" do
    forward conn, path, "http://verify-submission/inzending"
  end

  #################################################################
  # manual submission
  #################################################################

  get "/submission-forms/*path" do
    forward conn, path, "http://enrich-submission/submission-documents/"
  end

  put "/submission-forms/:id/flatten" do
    forward conn, [], "http://toezicht-flattened-form-data-generator/submission-documents/" <> id <> "/flatten"
  end

  put "/submission-forms/:id" do
    forward conn, [], "http://validate-submission/submission-documents/" <> id
  end

  post "/submission-forms/:id/submit" do
    forward conn, [], "http://validate-submission/submission-documents/" <> id <> "/submit"
  end

  match "/submission-documents/*path" do
    forward conn, path, "http://cache/submission-documents/"
  end

  get "/form-data/*path" do
    forward conn, path, "http://cache/form-data/"
  end

  get "/concept-schemes/*path" do
    forward conn, path, "http://cache/concept-schemes/"
  end

  get "/concepts/*path" do
    forward conn, path, "http://cache/concepts/"
  end

  get "/worship-decisions-cross-reference/search-documents/*path" do
    forward conn, path, "http://worship-decisions-cross-reference/search-documents/"
  end

  get "/worship-decisions-cross-reference/document-information/*path" do
    forward conn, path, "http://worship-decisions-cross-reference/document-information/"
  end

  #################################################################
  # dummy publications (to be removed)
  #################################################################

  get "/publications/*path" do
    forward conn, path, "http://static-file/publications/"
  end

  #################################################################
  # RRN SERVICE: person-uri-for-social-security-number-service
  #################################################################
  match "/rrn/*path" do
    forward conn, path, "http://person-uri-for-social-security-number/"
  end

  #################################################################
  # Vendor Login for SPARQL endpoint
  #################################################################

  post "/vendor/login/*path" do
    forward conn, path, "http://vendor-login/sessions"
  end

  delete "/vendor/logout" do
    forward conn, [], "http://vendor-login/sessions/current"
  end

  #################################################################
  # Vendor SPARQL endpoint
  #################################################################

  # Not only POST. SPARQL via GET is also allowed.
  match "/vendor/sparql" do
    forward conn, [], "http://sparql-authorization-wrapper/sparql"
  end

  #################################################################
  # Vendor data distribution tests
  #################################################################

  # The service protects this route. If not running in development, this route
  # in unavaliable. There should be no risk in exposing this route.
  get "/vendor-data-distribution/test" do
    forward conn, [], "http://vendor-data-distribution/test"
  end

  #################################################################
  # Catch all that is left
  #################################################################

  match "/*_" do
    send_resp( conn, 404, "Route not found.  See config/dispatcher.ex" )
  end

end
