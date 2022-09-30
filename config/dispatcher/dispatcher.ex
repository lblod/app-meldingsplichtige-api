defmodule Dispatcher do
  use Plug.Router

  def start(_argv) do
    port = 80
    IO.puts "Starting Plug with Cowboy on port #{port}"
    Plug.Adapters.Cowboy.http __MODULE__, [], port: port
    :timer.sleep(:infinity)
  end

  plug Plug.Logger
  plug :match
  plug :dispatch

  # In order to forward the 'themes' resource to the
  # resource service, use the following forward rule.
  #
  # docker-compose stop; docker-compose rm; docker-compose up
  # after altering this file.
  #
  # match "/themes/*path" do
  #   Proxy.forward conn, path, "http://resource/themes/"
  # end

  match "/bestuurseenheden/*path" do
    #Proxy.forward conn, path, "http://cache/bestuurseenheden/"
    Proxy.forward conn, path, "http://resource/bestuurseenheden/"
  end
  match "/bestuurseenheid-classificatie-codes/*path" do
    #Proxy.forward conn, path, "http://cache/bestuurseenheid-classificatie-codes/"
    Proxy.forward conn, path, "http://resource/bestuurseenheid-classificatie-codes/"
  end
  match "/bestuursorganen/*path" do
    #Proxy.forward conn, path, "http://cache/bestuursorganen/"
    Proxy.forward conn, path, "http://resource/bestuursorganen/"
  end
  match "/bestuursorgaan-classificatie-codes/*path" do
    #Proxy.forward conn, path, "http://cache/bestuursorgaan-classificatie-codes/"
    Proxy.forward conn, path, "http://resource/bestuursorgaan-classificatie-codes/"
  end
  match "/agendapunten/*path" do
    #Proxy.forward conn, path, "http://cache/agendapunten/"
    Proxy.forward conn, path, "http://resource/agendapunten/"
  end
  match "/behandelingen-van-agendapunten/*path" do
    #Proxy.forward conn, path, "http://cache/behandelingen-van-agendapunten/"
    Proxy.forward conn, path, "http://resource/behandelingen-van-agendapunten/"
  end
  match "/zittingen/*path" do
    #Proxy.forward conn, path, "http://cache/zittingen/"
    Proxy.forward conn, path, "http://resource/zittingen/"
  end


  get "/files/:id/download" do
    Proxy.forward conn, [], "http://file/files/" <> id <> "/download"
  end
  get "/files/*path" do
    #Proxy.forward conn, path, "http://cache/files/"
    Proxy.forward conn, path, "http://resource/files/"
  end
  patch "/files/*path" do
    #Proxy.forward conn, path, "http://cache/files/"
    Proxy.forward conn, path, "http://resource/files/"
  end
  post "/files/*path" do
    Proxy.forward conn, path, "http://file/files/"
  end
  post "/file-service/files/*path" do
    Proxy.forward conn, path, "http://file/files/"
  end
  delete "/files/*path" do
    Proxy.forward conn, path, "http://file/files/"
  end

  match "/mock/sessions/*path" do
    Proxy.forward conn, path, "http://mocklogin/sessions/"
  end
  match "/sessions/*path" do
    Proxy.forward conn, path, "http://login/sessions/"
  end
  match "/gebruikers/*path" do
    #Proxy.forward conn, path, "http://cache/gebruikers/"
    Proxy.forward conn, path, "http://resource/gebruikers/"
  end
  match "/accounts/*path" do
    #Proxy.forward conn, path, "http://cache/accounts/"
    Proxy.forward conn, path, "http://resource/accounts/"
  end


  delete "/submissions/*path" do
    Proxy.forward conn, path, "http://clean-up-submission/submissions/"
  end
  put "/submissions/*path" do
    #Proxy.forward conn, path, "http://cache/submissions/"
    Proxy.forward conn, path, "http://resource/submissions/"
  end
  patch "/submissions/*path" do
    #Proxy.forward conn, path, "http://cache/submissions/"
    Proxy.forward conn, path, "http://resource/submissions/"
  end
  post "/submissions/*path" do
    #Proxy.forward conn, path, "http://cache/submissions/"
    Proxy.forward conn, path, "http://resource/submissions/"
  end
  get "/submissions/*path" do
    #Proxy.forward conn, path, "http://cache/submissions/"
    Proxy.forward conn, path, "http://resource/submissions/"
  end
  match "/vendors/*path" do
    #Proxy.forward conn, path, "http://cache/vendors/"
    Proxy.forward conn, path, "http://resource/vendors/"
  end
  match "/authenticity-types/*path" do
    #Proxy.forward conn, path, "http://cache/authenticity-types/"
    Proxy.forward conn, path, "http://resource/authenticity-types/"
  end
  match "/tax-types/*path" do
    #Proxy.forward conn, path, "http://cache/tax-types/"
    Proxy.forward conn, path, "http://resource/tax-types/"
  end
  match "/tax-rates/*path" do
    #Proxy.forward conn, path, "http://cache/tax-rates/"
    Proxy.forward conn, path, "http://resource/tax-rates/"
  end
  match "/chart-of-accounts/*path" do
    #Proxy.forward conn, path, "http://cache/chart-of-accounts/"
    Proxy.forward conn, path, "http://resource/chart-of-accounts/"
  end
  match "/submission-document-statuses/*path" do
    #Proxy.forward conn, path, "http://cache/submission-document-statuses/"
    Proxy.forward conn, path, "http://resource/submission-document-statuses/"
  end

  match "/remote-urls/*path" do
    #Proxy.forward conn, path, "http://cache/remote-urls/"
    Proxy.forward conn, path, "http://resource/remote-urls/"
  end

  #################################################################
  # Resources for Jobs and their metadata
  #################################################################

  match "/tasks/*path" do
    #Proxy.forward conn, path, "http://cache/tasks/"
    Proxy.forward conn, path, "http://resource/tasks/"
  end

  match "/services/*path" do
    #Proxy.forward conn, path, "http://cache/services/"
    Proxy.forward conn, path, "http://resource/services/"
  end

  match "/statusses/*path" do
    #Proxy.forward conn, path, "http://cache/statusses/"
    Proxy.forward conn, path, "http://resource/statusses/"
  end

  match "/operations/*path" do
    #Proxy.forward conn, path, "http://cache/operations/"
    Proxy.forward conn, path, "http://resource/operations/"
  end

  match "/job-errors/*path" do
    #Proxy.forward conn, path, "http://cache/job-errors/"
    Proxy.forward conn, path, "http://resource/job-errors/"
  end

  match "/data-containers/*path" do
    #Proxy.forward conn, path, "http://cache/data-containers/"
    Proxy.forward conn, path, "http://resource/data-containers/"
  end

  #################################################################
  # Dashboard routes
  #################################################################

  # Reports
  match "/reports/*path" do
    #Proxy.forward conn, path, "http://cache/reports/"
    Proxy.forward conn, path, "http://resource/reports/"
  end

  # Logs
  match "/log-entries/*path" do
    #Proxy.forward conn, path, "http://cache/log-entries/"
    Proxy.forward conn, path, "http://resource/log-entries/"
  end

  match "/log-levels/*path" do
    #Proxy.forward conn, path, "http://cache/log-levels/"
    Proxy.forward conn, path, "http://resource/log-levels/"
  end

  match "/status-codes/*path" do
    #Proxy.forward conn, path, "http://cache/status-codes/"
    Proxy.forward conn, path, "http://resource/status-codes/"
  end

  match "/log-sources/*path" do
    #Proxy.forward conn, path, "http://cache/log-sources/"
    Proxy.forward conn, path, "http://resource/log-sources/"
  end

  match "/status-codes/*path" do
    #Proxy.forward conn, path, "http://cache/acm-idm-service-log-entries/"
    Proxy.forward conn, path, "http://resource/acm-idm-service-log-entries/"
  end
  
  # Jobs
  match "/jobs/*path" do
    #Proxy.forward conn, path, "http://cache/jobs/"
    Proxy.forward conn, path, "http://resource/jobs/"
  end

  #################################################################
  # automatic submission
  #################################################################
  
  match "/melding/*path" do
    Proxy.forward conn, path, "http://automatic-submission/melding"
  end

  post "/melding-status/*path" do
    Proxy.forward conn, path, "http://automatic-submission/status"
  end

  #################################################################
  # verify submission (to be removed)
  #################################################################

  get "/verify/bestuurseenheid/*path" do
    Proxy.forward conn, path, "http://verify-submission/bestuurseenheid"
  end
  get "/verify/inzending/*path" do
    Proxy.forward conn, path, "http://verify-submission/inzending"
  end

  #################################################################
  # manual submission
  #################################################################

  get "/submission-forms/*path" do
    Proxy.forward conn, path, "http://enrich-submission/submission-documents/"
  end

  put "/submission-forms/:id/flatten" do
    Proxy.forward conn, [], "http://toezicht-flattened-form-data-generator/submission-documents/" <> id <> "/flatten"
  end

  put "/submission-forms/:id" do
    Proxy.forward conn, [], "http://validate-submission/submission-documents/" <> id
  end

  post "/submission-forms/:id/submit" do
    Proxy.forward conn, [], "http://validate-submission/submission-documents/" <> id <> "/submit"
  end

  match "/submission-documents/*path" do
    #Proxy.forward conn, path, "http://cache/submission-documents/"
    Proxy.forward conn, path, "http://resource/submission-documents/"
  end

  get "/form-data/*path" do
    #Proxy.forward conn, path, "http://cache/form-data/"
    Proxy.forward conn, path, "http://resource/form-data/"
  end

  get "/concept-schemes/*path" do
    #Proxy.forward conn, path, "http://cache/concept-schemes/"
    Proxy.forward conn, path, "http://resource/concept-schemes/"
  end

  get "/concepts/*path" do
    #Proxy.forward conn, path, "http://cache/concepts/"
    Proxy.forward conn, path, "http://resource/concepts/"
  end

  #################################################################
  # dummy publications (to be removed)
  #################################################################

  get "/publications/*path" do
    Proxy.forward conn, path, "http://static-file/publications/"
  end

  #################################################################
  # RRN SERVICE: person-uri-for-social-security-number-service
  #################################################################
  match "/rrn/*path" do
    Proxy.forward conn, path, "http://person-uri-for-social-security-number/"
  end

  match _ do
    send_resp( conn, 404, "Route not found.  See config/dispatcher.ex" )
  end

end
