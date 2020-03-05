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
    Proxy.forward conn, path, "http://cache/bestuurseenheden/"
  end
  match "/bestuurseenheid-classificatie-codes/*path" do
    Proxy.forward conn, path, "http://cache/bestuurseenheid-classificatie-codes/"
  end
  match "/bestuursorganen/*path" do
    Proxy.forward conn, path, "http://cache/bestuursorganen/"
  end
  match "/bestuursorgaan-classificatie-codes/*path" do
    Proxy.forward conn, path, "http://cache/bestuursorgaan-classificatie-codes/"
  end
  match "/agendapunten/*path" do
    Proxy.forward conn, path, "http://cache/agendapunten/"
  end
  match "/behandelingen-van-agendapunten/*path" do
    Proxy.forward conn, path, "http://cache/behandelingen-van-agendapunten/"
  end
  match "/zittingen/*path" do
    Proxy.forward conn, path, "http://cache/zittingen/"
  end


  get "/files/:id/download" do
    Proxy.forward conn, [], "http://file/files/" <> id <> "/download"
  end
  get "/files/*path" do
    Proxy.forward conn, path, "http://resource/files/"
  end
  patch "/files/*path" do
    Proxy.forward conn, path, "http://resource/files/"
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
    Proxy.forward conn, path, "http://cache/gebruikers/"
  end
  match "/accounts/*path" do
    Proxy.forward conn, path, "http://cache/accounts/"
  end


  match "/submissions/*path" do
    Proxy.forward conn, path, "http://cache/submissions/"
  end
  match "/submission-documents/*path" do
    Proxy.forward conn, path, "http://cache/submission-documents/"
  end
  match "/vendors/*path" do
    Proxy.forward conn, path, "http://cache/vendors/"
  end
  match "/authenticity-types/*path" do
    Proxy.forward conn, path, "http://cache/authenticity-types/"
  end
  match "/tax-types/*path" do
    Proxy.forward conn, path, "http://cache/tax-types/"
  end
  match "/tax-rates/*path" do
    Proxy.forward conn, path, "http://cache/tax-rates/"
  end
  match "/chart-of-accounts/*path" do
    Proxy.forward conn, path, "http://cache/chart-of-accounts/"
  end
  match "/submission-document-statuses/*path" do
    Proxy.forward conn, path, "http://cache/submission-document-statuses/"
  end

  # TODO redirect to cache instead of resource remote-urls

  match "/remote-urls/*path" do
    Proxy.forward conn, path, "http://resource/remote-urls/"
  end

  #################################################################
  # automatic submission
  #################################################################
  match "/melding/*path" do
    Proxy.forward conn, path, "http://automatic-submission/melding"
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

  post "/submission-forms/:id/submit" do
    Proxy.forward conn, [], "http://validate-submission/submission-documents/" <> id <> "/submit"
  end

  match "/submission-forms/*path" do
    Proxy.forward conn, path, "http://enrich-submission/submission-documents/"
  end

  #################################################################
  # flatten submissions
  #################################################################

  post "/submission-forms/:id/flatten" do
    Proxy.forward conn, [], "http://toezicht-flattened-form-data-generator/submission-documents/" <> id <> "/flatten"
  end

  #################################################################
  # dummy publications (to be removed)
  #################################################################

  get "/publications/*path" do
    Proxy.forward conn, path, "http://static-file/publications/"
  end

  match _ do
    send_resp( conn, 404, "Route not found.  See config/dispatcher.ex" )
  end

end
