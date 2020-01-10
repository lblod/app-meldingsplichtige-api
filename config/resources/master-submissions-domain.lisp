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
                                  :as "submitted-resource")
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
  :class (s-prefix "ext:SubmissionDocument") ; Subclass of foaf:Document ; Subclass of eli:LegalExpression
  :properties `((:publication-date :date ,(s-prefix "eli:date_publication"))
                (:report-year :gYear ,(s-prefix "elod:financialYear"))
                (:first-date-in-force :date ,(s-prefix "eli:first_date_entry_in_force"))
                (:date-no-longer-in-force :date ,(s-prefix "eli:date_no_longer_in_force"))
                (:has-additional-tax-rate :boolean ,(s-prefix "lblodBesluit:hasAdditionalTaxRate"))
                (:beschrijving :string ,(s-prefix "dct:description"))
                (:opmerking :string ,(s-prefix "rdfs:comment")))
  :has-one `((bestuursorgaan :via ,(s-prefix "eli:passed_by")
                             :as "passed-by")
             (bestuurseenheid :via ,(s-prefix "eli:is_about")
                              :as "subject")
             (behandeling-van-agendapunt :via ,(s-prefix "ext:generatedSubmissionDocument") ;; subproperty of prov:generated
                                         :inverse t
                                         :as "agenda-item-treatment")
             (authenticity-type :via ,(s-prefix "melding:authenticityType")
                                :as "authenticity-type")
             (chart-of-account :via ,(s-prefix "lblodBesluit:chartOfAccount")
                               :as "chart-of-account")
             (tax-rate :via ,(s-prefix "lblodBesluit:taxRate")
                       :as "tax-rate")
             (tax-type :via ,(s-prefix "lblodBesluit:taxType")
                       :as "tax-type"))
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

