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
(read-domain-file "jobs.lisp")
(read-domain-file "reports.lisp")
