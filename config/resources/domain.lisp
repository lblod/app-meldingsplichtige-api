(in-package :mu-cl-resources)

(defparameter *cache-count-queries* t)
(defparameter *supply-cache-headers-p* t
  "when non-nil, cache headers are supplied.  this works together with mu-cache.")
(setf *cache-model-properties-p* t)
(defparameter *include-count-in-paginated-responses* t
  "when non-nil, all paginated listings will contain the number
   of responses in the result object's meta.")
(defparameter *max-group-sorted-properties* nil)
(defparameter sparql:*experimental-no-application-graph-for-sudo-select-queries* t)

(read-domain-file "master-files-domain.lisp")
(read-domain-file "master-submissions-domain.lisp")
(read-domain-file "slave-besluit-domain.lisp")
(read-domain-file "master-users-domain.lisp")

(define-resource file ()
  :class (s-prefix "nfo:FileDataObject")
  :properties `((:filename :string ,(s-prefix "nfo:fileName"))
                (:format :string ,(s-prefix "dct:format"))
                (:size :number ,(s-prefix "nfo:fileSize"))
                (:extension :string ,(s-prefix "dbpedia:fileExtension"))
                (:created :datetime ,(s-prefix "nfo:fileCreated")))
  :has-one `((file :via ,(s-prefix "nie:dataSource")
                   :inverse t
                   :as "download"))
  :resource-base (s-url "http://data.lblod.info/files/")
  :features `(include-uri)
  :on-path "files")
