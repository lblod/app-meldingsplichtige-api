(define-resource automatic-submission-task ()
  :class (s-prefix "melding:AutomaticSubmissionTask")
  :properties `((:created :datetime ,(s-prefix "dct:created")))
  :has-one `((submission :via ,(s-prefix "prov:generated")
                         :as "submission"))
  :resource-base (s-url "http://data.lblod.info/automatic-submission-tasks/")
  :on-path "automatic-submission-tasks")

(define-resource submission ()
  :class (s-prefix "meb:Submission")
  :properties `((:href :url ,(s-prefix "prov:atLocation")))
  :has-one `((bestuurseenheid :via ,(s-prefix "pav:createdBy")
                              :as "organization")
             (vendor :via ,(s-prefix "pav:providedBy")
                     :as "publisher")
             (submission-document :via ,(s-prefix "dct:subject")
                                  :as "submission-document")
             (submission-document-status :via ,(s-prefix "adms:status")
                                         :as "status")
             (automatic-submission-task :via ,(s-prefix "prov:generated")
                                        :inverse t
                                        :as "task"))
  :has-many `((file :via ,(s-prefix "nfo:FileDataObject")
                    :as "file"))
  :resource-base (s-url "http://data.lblod.info/submissions/")
  :features `(include-uri)
  :on-path "submissions")

(define-resource submission-document ()
  :class (s-prefix "ext:SubmissionDocument")
  :has-one `((submission-document :via ,(s-prefix "dct:subject")
                                  :inverse t
                                  :as "submission"))
  :resource-base (s-url "http://data.lblod.info/submission-documents/")
  :features `(include-uri)
  :on-path "submission-documents")

(define-resource vendor ()
  :class (s-prefix "ext:Vendor") ; Subclass of foaf:Agent
  :properties `((:name :string ,(s-prefix "foaf:name"))
                (:key :string ,(s-prefix "muAccount:key")))
  :resource-base (s-url "http://data.lblod.info/vendors/")
  :features `(include-uri)
  :on-path "vendors")

(define-resource tax-rate ()
  :class (s-prefix "lblodBesluit:TaxRate") ; Subclass of schema:UnitPriceSpecification
  :properties `((:amount :number ,(s-prefix "schema:price")))
  :resource-base (s-url "http://data.lblod.info/tax-rates/")
  :features `(include-uri)
  :on-path "tax-rates")

;; CODELISTS

(define-resource submission-document-status () ;; subclass of skos:Concept
  :class (s-prefix "ext:SubmissionDocumentStatus")
  :properties `((:label :string ,(s-prefix "skos:prefLabel")))
  :resource-base (s-url "http://lblod.data.gift/concepts/")
  :features `(include-uri)
  :on-path "submission-document-statuses")

(define-resource authenticity-type ()
  :class (s-prefix "ext:AuthenticityType") ;; subclass of skos:Concept
  :properties `((:label :string ,(s-prefix "skos:prefLabel")))
  :resource-base (s-url "http://lblod.data.gift/concepts/")
  :features `(include-uri)
  :on-path "authenticity-types")

(define-resource tax-type () ;; subclass of skos:Concept
  :class (s-prefix "ext:TaxType")
  :properties `((:label :string ,(s-prefix "skos:prefLabel")))
  :resource-base (s-url "http://lblod.data.gift/concepts/")
  :features `(include-uri)
  :on-path "tax-types")

(define-resource chart-of-account () ;; subclass of skos:Concept
  :class (s-prefix "ext:ChartOfAccount")
  :properties `((:label :string ,(s-prefix "skos:prefLabel")))
  :resource-base (s-url "http://lblod.data.gift/concepts/")
  :features `(include-uri)
  :on-path "chart-of-accounts")

(define-resource form-data ()
  :class (s-prefix "melding:FormData") ;
  :properties `((:type :string ,(s-prefix "dct:type"))
                (:datePublication :datetime ,(s-prefix "eli:date_publication"))
                (:passedBy :url ,(s-prefix "eli:passed_by"))
                (:isAbout :url ,(s-prefix "eli:is_about"))
                (:financialYear :string ,(s-prefix "elod:financialYear"))
                (:description :string ,(s-prefix "dct:description"))
                (:comment :string ,(s-prefix "dct:comment")))
  :resource-base (s-url "http://data.lblod.info/form-data/")
  :features `(include-uri)
  :on-path "form-data")