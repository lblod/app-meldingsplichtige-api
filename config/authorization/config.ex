alias Acl.Accessibility.Always, as: AlwaysAccessible
alias Acl.Accessibility.ByQuery, as: AccessByQuery
alias Acl.GraphSpec.Constraint.Resource.AllPredicates, as: AllPredicates
alias Acl.GraphSpec.Constraint.Resource.NoPredicates, as: NoPredicates
alias Acl.GraphSpec.Constraint.ResourceFormat, as: ResourceFormatConstraint
alias Acl.GraphSpec.Constraint.Resource, as: ResourceConstraint
alias Acl.GraphSpec, as: GraphSpec
alias Acl.GroupSpec, as: GroupSpec
alias Acl.GroupSpec.GraphCleanup, as: GraphCleanup

defmodule Acl.UserGroups.Config do
  defp access_by_role(group_string) do
    %AccessByQuery{
      vars: ["session_group", "session_role"],
      query: sparql_query_for_access_role(group_string)
    }
  end

  defp sparql_query_for_access_role(group_string) do
    "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    SELECT ?session_group ?session_role WHERE {
      <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group;
                   ext:sessionRole ?session_role.
      FILTER( ?session_role = \"#{group_string}\" )
    }"
  end

  defp can_access_automatic_submission() do
    %AccessByQuery{
      vars: [],
      query: "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        SELECT ?session_group ?session_role WHERE {
          ?session_id ext:sessionGroup/mu:uuid ?session_group;
                       ext:sessionRole ?session_role.
          FILTER( ?session_role = \"LoketLB-vendorManagementGebruiker\" )
        }"
      }
  end

  defp access_for_vendor_api() do
    %AccessByQuery{
      vars: ["vendor_id", "session_group"],
      query: sparql_query_for_access_vendor_api()
    }
  end

  defp sparql_query_for_access_vendor_api() do
    " PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      SELECT DISTINCT ?vendor_id ?session_group WHERE {
        <SESSION_ID> muAccount:canActOnBehalfOf/mu:uuid ?session_group;
                     muAccount:account/mu:uuid ?vendor_id.
      } "
  end

  def user_groups do
    # These elements are walked from top to bottom.  Each of them may
    # alter the quads to which the current query applies.  Quads are
    # represented in three sections: current_source_quads,
    # removed_source_quads, new_quads.  The quads may be calculated in
    # many ways.  The useage of a GroupSpec and GraphCleanup are
    # common.
    [
      # // PUBLIC
      %GroupSpec{
        name: "public",
        useage: [:read],
        access: %AlwaysAccessible{}, # TODO: Should be only for logged in users
        graphs: [ %GraphSpec{
                    graph: "http://mu.semte.ch/graphs/public",
                    constraint: %ResourceConstraint{
                      resource_types: [
                        "http://data.vlaanderen.be/ns/besluit#Bestuurseenheid",
                        "http://mu.semte.ch/vocabularies/ext/BestuurseenheidClassificatieCode",
                        "http://data.vlaanderen.be/ns/besluit#Bestuursorgaan",
                        "http://mu.semte.ch/vocabularies/ext/BestuursorgaanClassificatieCode",
                        "http://mu.semte.ch/vocabularies/ext/ChartOfAccount",
                        "http://mu.semte.ch/vocabularies/ext/AuthenticityType",
                        "http://mu.semte.ch/vocabularies/ext/TaxType",
                        "http://mu.semte.ch/vocabularies/ext/SubmissionDocumentStatus",
                        "http://data.vlaanderen.be/ns/besluit#Zitting",
                        "http://data.vlaanderen.be/ns/besluit#Agendapunt",
                        "http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt",
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#RemoteDataObject",
                        "http://www.w3.org/2004/02/skos/core#ConceptScheme",
                        "http://www.w3.org/2004/02/skos/core#Concept"
                      ] } } ] },
      # // TOEZICHT
      %GroupSpec{
        name: "o-toez-rwf",
        useage: [:read, :write, :read_for_write],
        access: access_by_role( "LoketLB-toezichtGebruiker" ),
        graphs: [ %GraphSpec{
                    graph: "http://mu.semte.ch/graphs/organizations/",
                    constraint: %ResourceConstraint{
                      resource_types: [
                        "http://xmlns.com/foaf/0.1/Document",
                        "http://rdf.myexperiment.org/ontologies/base/Submission",
                        "http://mu.semte.ch/vocabularies/ext/SubmissionDocument",
                        "http://lblod.data.gift/vocabularies/besluit/TaxRate",
                        "http://lblod.data.gift/vocabularies/automatische-melding/FormData",
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject",
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#LocalFileDataObject",
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#RemoteDataObject",
                        "http://lblod.data.gift/services/Service",
                        "http://redpencil.data.gift/vocabularies/tasks/Operation",
                        "http://vocab.deri.ie/cogs#ExecutionStatus",
                        "http://redpencil.data.gift/vocabularies/tasks/Task",
                        "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#DataContainer",
                        "http://lblod.data.gift/vocabularies/harvesting/HarvestingCollection",
                        "http://vocab.deri.ie/cogs#Job"
                      ] } } ] },

      # // TOEZICHT VENDOR API
      %GroupSpec{
        name: "o-vendor-api-r",
        useage: [:read],
        access: access_for_vendor_api(),
        graphs: [ %GraphSpec{
                    graph: "http://mu.semte.ch/graphs/vendors/",
                    constraint: %ResourceConstraint{
                      resource_types: [
                        "http://rdf.myexperiment.org/ontologies/base/Submission",
                        "http://mu.semte.ch/vocabularies/ext/SubmissionDocument",
                        "http://lblod.data.gift/vocabularies/automatische-melding/FormData",
                      ] } } ] },

      # // VENDOR MANAGEMENT
      %GroupSpec{
        name: "o-toezicht-vendor-management-rwf",
        useage: [:read, :write, :read_for_write],
        access: can_access_automatic_submission(),
        graphs: [ %GraphSpec{
                    graph: "http://mu.semte.ch/graphs/automatic-submission",
                    constraint: %ResourceConstraint{
                      resource_types: [
                      ] } } ] },

      # // USER HAS NO DATA
      # this was moved to org instead.
      # perhaps move some elements to public when needed for demo
      # purposes.


      # // CLEANUP
      #
      %GraphCleanup{
        originating_graph: "http://mu.semte.ch/application",
        useage: [:write],
        name: "clean"
      }
    ]
  end
end
