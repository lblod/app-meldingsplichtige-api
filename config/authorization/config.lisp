;;;;;;;;;;;;;;;;;;;
;;; delta messenger
(in-package :delta-messenger)

(add-delta-logger)
(add-delta-messenger "http://deltanotifier/")

;;;;;;;;;;;;;;;;;
;;; configuration
(in-package :client)
(setf *log-sparql-query-roundtrip* t)
(setf *backend* "http://virtuoso:8890/sparql")

(in-package :server)
(setf *log-incoming-requests-p* t)

;;;;;;;;;;;;;;;;;
;;; access rights
(in-package :acl)

(defparameter *access-specifications* nil)
(defparameter *graphs* nil)
(defparameter *rights* nil)

(define-prefixes
    :besluit "http://data.vlaanderen.be/ns/besluit#"
    :ext "http://mu.semte.ch/vocabularies/ext/"
    :nfo "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#"
    :skos "http://www.w3.org/2004/02/skos/core#"
    :foaf "http://xmlns.com/foaf/0.1/"
    :base "http://rdf.myexperiment.org/ontologies/base/"
    :am "http://lblod.data.gift/vocabularies/automatische-melding/"
    :tasks "http://redpencil.data.gift/vocabularies/tasks/"
    :cogs "http://vocab.deri.ie/cogs#"
    :besluit2 "http://lblod.data.gift/vocabularies/besluit/"
    :services "http://lblod.data.gift/services/"
    :harvesting "http://lblod.data.gift/vocabularies/harvesting/")

(define-graph public ("http://mu.semte.ch/graphs/public")
    ("besluit:Bestuurseenheid" -> _)
    ("ext:BestuurseenheidClassificatieCode" -> _)
    ("besluit:Bestuursorgaan" -> _)
    ("ext:BestuursorgaanClassificatieCode" -> _)
    ("ext:ChartOfAccount" -> _)
    ("ext:AuthenticityType" -> _)
    ("ext:TaxType" -> _)
    ("ext:SubmissionDocumentStatus" -> _)
    ("besluit:Zitting" -> _)
    ("besluit:Agendapunt" -> _)
    ("besluit:BehandelingVanAgendapunt" -> _)
    ("nfo:FileDataObject" -> _)
    ("nfo:RemoteDataObject" -> _)
    ("skos:ConceptScheme" -> _)
    ("skos:Concept" -> _))

(define-graph org ("http://mu.semte.ch/graphs/organizations/")
    ("foaf:Document" -> _)
    ("base:Submission" -> _)
    ("ext:SubmissionDocument" -> _)
    ("besluit2:TaxRate" -> _)
    ("am:FormData" -> _)
    ("nfo:FileDataObject" -> _)
    ("nfo:LocalFileDataObject" -> _)
    ("nfo:RemoteDataObject" -> _)
    ("services:Service" -> _)
    ("tasks:Operation" -> _)
    ("cogs:ExecutionStatus" -> _)
    ("tasks:Task" -> _)
    ("nfo:DataContainer" -> _)
    ("harvesting:HarvestingCollection" -> _)
    ("cogs:Job" -> _))

(define-graph vendors ("http://mu.semte.ch/graphs/vendors/")
    ("base:Submission" -> _)
    ("ext:SubmissionDocument" -> _)
    ("am:FormData" -> _))

(define-graph automatic-submission ("http://mu.semte.ch/graphs/automatic-submission")
    (_ -> _))

(supply-allowed-group "public")

(supply-allowed-group "toezicht-gebruiker"
    :parameters ("session_group" "session_role")
    :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
            PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
            SELECT ?session_group ?session_role WHERE {
                <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group;
                            ext:sessionRole ?session_role.
                FILTER( ?session_role = \"LoketLB-toezichtGebruiker\" )
            }")

(supply-allowed-group "vendor-api"
    :parameters ("vendor_id" "session_group")
    :query "PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
            PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
            SELECT DISTINCT ?vendor_id ?session_group WHERE {
                <SESSION_ID> muAccount:canActOnBehalfOf/mu:uuid ?session_group;
                            muAccount:account/mu:uuid ?vendor_id.
            }")

(supply-allowed-group "vendor-management"
    :parameters ()
    :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
            PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
            SELECT ?session_group ?session_role WHERE {
                <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group;
                            ext:sessionRole ?session_role.
                FILTER( ?session_role = \"LoketLB-vendorManagementGebruiker\" )
            }")

(grant (read)
    :to-graph (public)
    :for-allowed-group "public")

(grant (read write)
    :to-graph (org)
    :for-allowed-group "toezicht-gebruiker")

(supply-allowed-group "databank-erediensten-gebruiker"
    :parameters ("session_group" "session_role")
    :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
            PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
            SELECT ?session_group ?session_role WHERE {
                <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group;
                            ext:sessionRole ?session_role.
                FILTER( ?session_role = \"LoketLB-databankEredienstenGebruiker\" )
            }")

(grant (read write)
    :to-graph (org)
    :for-allowed-group "databank-erediensten-gebruiker")

(grant (read)
    :to-graph (vendors)
    :for-allowed-group "vendor-api")

(grant (read write)
    :to-graph (automatic-submission)
    :for-allowed-group "vendor-management")
