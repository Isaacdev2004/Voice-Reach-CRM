"use client";
/** Read-only presentation of already-authorized tool results. Never renders raw JSON or HTML. */
export function StructuredData({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}) {
  if (value == null) return <span>Not recorded</span>;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (["string", "number"].includes(typeof value))
    return <span>{String(value)}</span>;
  if (depth >= 4)
    return <span>Open the source record for additional detail.</span>;
  if (Array.isArray(value))
    return value.length ? (
      <ul>
        {value.slice(0, 12).map((item, index) => (
          <li key={index}>
            <StructuredData value={item} depth={depth + 1} />
          </li>
        ))}
        {value.length > 12 && <li>Showing the first 12 results.</li>}
      </ul>
    ) : (
      <p>No matching records returned.</p>
    );
  if (typeof value === "object")
    return (
      <dl>
        {Object.entries(value)
          .filter(
            ([key]) =>
              !/(^id$|Id$|_id$|token|secret|digest|owner|metadata|authorization)/i.test(
                key,
              ),
          )
          .slice(0, 20)
          .map(([key, item]) => (
            <div key={key}>
              <dt>
                {key.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2")}
              </dt>
              <dd>
                <StructuredData value={item} depth={depth + 1} />
              </dd>
            </div>
          ))}
      </dl>
    );
  return null;
}
export function SourceResults({
  results,
}: {
  results: { name: string; data: unknown }[];
}) {
  return (
    <section className="aw-sources">
      <h3>Retrieved CRM context</h3>
      <p>
        Source data returned by authorized tools. Generated recommendations are
        shown separately in the conversation.
      </p>
      {results.map((result, i) => (
        <details key={`${result.name}-${i}`}>
          <summary>{result.name.replaceAll("_", " ")}</summary>
          <StructuredData value={result.data} />
        </details>
      ))}
    </section>
  );
}
