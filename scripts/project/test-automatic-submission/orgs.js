import { ORG_UNIT, ORGAN_IN_TIJD, ORGAN_ABSTRACT, ORGAN_LABEL } from "./config.js";
import { sparql } from "./sparql.js";
import { organsQuery, singleOrganQuery } from "./queries.js";

// The template's zitting must be held by the time-specialised Gemeenteraad of
// the chosen bestuurseenheid. Only gemeenten are supported - they are the one
// type that always has a Gemeenteraad. For the default (gemeente Mechelen) the
// pinned constants from config.js are used. For any other bestuurseenheid the
// Gemeenteraad is looked up in the triplestore (the query filters on the
// Gemeenteraad classification) and its most recently started
// time-specialisation is used. If that does not resolve to exactly one organ,
// the found organs are listed and the organ URI can be passed as the next
// argument instead.

function describeOrgan(organ) {
  const inTijd = organ.inTijd.map((version) => version.uri + " (bindingStart " + version.bindingStart + ")").join(", ");
  return organ.label + ": " + inTijd;
}

export async function resolveOrgan(input) {
  if (!input.organUri && input.eenheidUri === ORG_UNIT) {
    return {
      ...input,
      orgUnit: ORG_UNIT,
      organInTijd: ORGAN_IN_TIJD,
      organAbstract: ORGAN_ABSTRACT,
      organLabel: ORGAN_LABEL,
    };
  }
  if (input.organUri) return resolveGivenOrgan(input);

  const rows = await sparql(organsQuery(input.eenheidUri));
  if (rows && rows.error) throw new Error("bestuursorgaan lookup failed: " + rows.error);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(
      "no Gemeenteraad found for " + input.eenheidUri +
        " - only bestuurseenheden of type gemeente are supported"
    );
  }
  const organsByAbstract = new Map();
  for (const row of rows) {
    const abstract = row.orgaanAbstract.value;
    if (!organsByAbstract.has(abstract)) {
      organsByAbstract.set(abstract, {
        abstract,
        label: row.label.value,
        inTijd: [],
      });
    }
    organsByAbstract.get(abstract).inTijd.push({
      uri: row.orgaanInTijd.value,
      bindingStart: row.bindingStart.value,
    });
  }
  const organs = [...organsByAbstract.values()];
  if (organs.length !== 1) {
    throw new Error(
      "expected exactly 1 Gemeenteraad for " + input.eenheidUri + ", found " + organs.length +
        " - pass the bestuursorgaan (in tijd) URI as the next argument; organs found: " +
        organs.map(describeOrgan).join(" | ")
    );
  }
  const organ = organs[0];
  organ.inTijd.sort((left, right) => (left.bindingStart < right.bindingStart ? 1 : -1));
  const latest = organ.inTijd[0];
  console.log("bestuursorgaan resolved via lookup: " + organ.label + " - " + latest.uri);
  return {
    ...input,
    orgUnit: input.eenheidUri,
    organInTijd: latest.uri,
    organAbstract: organ.abstract,
    organLabel: organ.label,
  };
}

async function resolveGivenOrgan(input) {
  const rows = await sparql(singleOrganQuery(input.organUri));
  if (rows && rows.error) throw new Error("bestuursorgaan lookup failed: " + rows.error);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(
      "no Gemeenteraad found for " + input.organUri +
        " - is the URI correct, and is it the Gemeenteraad of a gemeente?"
    );
  }
  const row = rows[0];
  if (row.eenheid.value !== input.eenheidUri) {
    throw new Error("the given bestuursorgaan belongs to " + row.eenheid.value + ", not to " + input.eenheidUri);
  }
  console.log("bestuursorgaan from argument: " + row.label.value + " - " + row.orgaanInTijd.value);
  return {
    ...input,
    orgUnit: input.eenheidUri,
    organInTijd: row.orgaanInTijd.value,
    organAbstract: row.orgaanAbstract.value,
    organLabel: row.label.value,
  };
}
