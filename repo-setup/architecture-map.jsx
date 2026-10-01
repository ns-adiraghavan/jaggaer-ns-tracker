// architecture-map.jsx — JAGGAER pillar/cluster architecture map (static reference).
// The topic map is rendered inside a sandboxed iframe (srcDoc) so its page-level
// styles (body / h1 / h2 / p / table / th / td) stay fully isolated from the
// tracker's own CSS and cannot leak into the app. The iframe auto-sizes to its
// content on load so the whole map scrolls naturally inside the panel.

const { useRef: useArchMapRef } = React;

const ARCH_MAP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>JAGGAER pillar/cluster architecture</title>
<style>
  :root{
    --bg:#faf9f6; --ink:#1e1e1c; --sub:#6b6a63; --line:#d8d6cd;
    --master:#1f5f8b; --master-bg:#eaf2f7;
    --pillar:#5b3a63; --pillar-bg:#f3ecf5;
    --cross:#a3651f; --cross-bg:#fbf1e6;
  }
  *{box-sizing:border-box;}
  body{margin:0;padding:32px 24px 64px;background:var(--bg);color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;}
  .wrap{max-width:1200px;margin:0 auto;}
  h1{font-size:22px;font-weight:600;margin:0 0 6px;}
  h2{font-size:17px;font-weight:600;margin:36px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--line);}
  .subtitle{color:var(--sub);font-size:14.5px;margin:0 0 24px;max-width:760px;line-height:1.55;}
  p{font-size:14px;line-height:1.65;max-width:820px;margin:0 0 12px;}
  .rule{background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px 18px;margin:10px 0;font-size:13.5px;line-height:1.6;}
  .rule b{color:var(--ink);}
  table{border-collapse:collapse;width:100%;max-width:900px;font-size:13.5px;margin:10px 0 20px;background:#fff;}
  th{background:var(--ink);color:#fff;padding:8px 12px;text-align:left;font-weight:600;}
  td{padding:8px 12px;border-bottom:1px solid var(--line);}

  section{margin-bottom:40px;}
  .chart{display:flex;gap:20px;align-items:flex-start;overflow-x:auto;padding-bottom:12px;}
  .col{display:flex;flex-direction:column;align-items:center;min-width:200px;flex-shrink:0;}
  .box{width:100%;padding:9px 12px;border-radius:6px;border:1px solid var(--line);background:#fff;font-size:13px;text-align:center;}
  .box.master{font-weight:600;font-size:15px;border-color:var(--master);color:var(--master);background:var(--master-bg);
    max-width:1160px;margin:0 auto 20px;padding:14px;}
  .box.root{font-weight:600;border-color:var(--pillar);color:var(--pillar);background:var(--pillar-bg);}
  .box.cross-root{font-weight:600;border-color:var(--cross);color:var(--cross);background:var(--cross-bg);}
  .connector{width:1px;height:16px;background:var(--line);}
  .url{display:block;font-weight:400;font-size:11px;color:var(--sub);margin-top:2px;}
  .stack{width:100%;border:1px solid var(--line);border-radius:6px;background:#fff;padding:6px;display:flex;flex-direction:column;gap:5px;}
  .leaf{padding:6px 10px;border-radius:5px;background:var(--bg);font-size:12.5px;text-align:center;}
  .branch{border-left:2px solid var(--line);padding-left:9px;margin-left:2px;}
  .branch>.label{font-size:12.5px;font-weight:500;margin-bottom:5px;text-align:left;}
  .branch .leaf{text-align:left;margin-bottom:0;}
  .branch .leaf+.leaf{margin-top:5px;}
</style>
</head>
<body>
<div class="wrap">
  <h1>JAGGAER pillar/cluster architecture</h1>
  <p class="subtitle">The full topic map — one master pillar, six product pillars, their clusters, and the cross-cutting layer that links into them.</p>

  <h2>What qualifies as a pillar page</h2>
  <p>A page counts as a pillar only if it meets all five of these:</p>
  <div class="rule">
    <b>1. Platform-level, not feature-level</b> — answers "what is this product," not "how does this specific thing work."<br>
    <b>2. Has at least 2 named cluster pages beneath it</b> — fewer than that, and it's really a cluster itself. <i>Two confirmed exceptions: Source-to-Pay (suite overview, links to 5 sibling pillars instead) and AI in Procurement (1 product cluster, but qualifies on traffic/strategic grounds — see linking section below).</i><br>
    <b>3. Is the sole canonical URL for its topic domain</b> — no competing duplicate URL for the same head term.<br>
    <b>4. Sits in primary site navigation</b> — reachable from Products or Solutions within 1-2 clicks.<br>
    <b>5. Targets a head/commercial keyword</b> distinct from — and broader than — its clusters' more specific terms.
  </div>

  <h2>Outbound linking requirements by tier</h2>
  <p>Every page needs <b>at least 4 internal links out</b> — not just the one mandatory upward link. A page with a single outbound link points nowhere but up: it wastes crawl budget, gives Google only one relevance signal instead of several, and gives a reader no path forward except back to a broader page. The mandatory "up" link is the floor, not the whole requirement.</p>

  <div class="rule">
    <b>Master pillar (jaggaer.com)</b>
    <ul style="margin:8px 0 4px 18px;">
      <li>1 link to each of the 6 pillars — already 6 links, clears the minimum on its own</li>
    </ul>
    <i>Why:</i> the homepage carries the most authority on the site. Splitting it evenly across all 6 pillars means each one gets a real share of that authority and is reachable in one click — nothing is starved.
  </div>

  <div class="rule">
    <b>Pillar page (×6)</b>
    <ul style="margin:8px 0 4px 18px;">
      <li>1 link up to jaggaer.com — reinforces the "source to pay" umbrella keyword</li>
      <li>1 link down to each of its own clusters — if that's 3+ clusters, the minimum is already met this way</li>
      <li>If it has fewer than 3 clusters, add 1-2 links to the most relevant cross-cutting page(s) (a vertical, role, or need) to reach 4</li>
    </ul>
    <i>Why:</i> the link up keeps the pillar tied to the master keyword; the links down spread authority into the clusters that need it most and give Google a clear path to the commercial pages; the cross-cutting fallback exists so a pillar with few clusters isn't left under-linked.
  </div>

  <div class="rule">
    <b>Cluster page</b>
    <ul style="margin:8px 0 4px 18px;">
      <li>1 link up to its parent pillar — mandatory</li>
      <li>2-3 links sideways to sibling clusters under the <i>same</i> pillar (e.g. Sourcing Optimization → Category Management, both under Source-to-Contract)</li>
      <li>If its pillar has fewer than 2 other clusters (e.g. JAI, Supplier Network, Supplier Identity Management), fill the remainder with links to relevant cross-cutting pages or supporting content instead</li>
    </ul>
    <i>Why:</i> the link up is what makes the hierarchy work. Sideways links within the same pillar are a different thing from cross-pillar lateral links — they're natural, expected, and help because a visitor reading about one capability in a product line is a good candidate for a related capability in that same line.
  </div>

  <div class="rule">
    <b>Supporting content (blog post)</b>
    <ul style="margin:8px 0 4px 18px;">
      <li>1 link up to the single cluster it supports most closely — mandatory, never skipped</li>
      <li>2-3 links to other closely related blog posts, or to the cluster's sibling clusters</li>
    </ul>
    <i>Why:</i> the link up is what turns an orphaned post into part of the topic cluster. The related-post links build a "silo" effect — they keep a reader moving through content on the same topic instead of bouncing, and they reinforce to Google which posts belong to the same subject.
  </div>

  <div class="rule">
    <b>Cross-cutting page (vertical/role/need)</b>
    <ul style="margin:8px 0 4px 18px;">
      <li>1 link into each pillar or cluster it's genuinely relevant to (per the relevance mapping above — usually 1-3)</li>
      <li>If genuine relevance gives fewer than 4, fill the remainder with links to supporting blog posts written for that same audience or need — never with an irrelevant pillar just to hit the number</li>
    </ul>
    <i>Why:</i> relevance comes first — a Healthcare page linking into Source-to-Contract just to hit 4 would dilute the signal that Healthcare actually cares about Supplier Management and Procure-to-Pay. Filling gaps with matching supporting content keeps every link genuinely useful to the reader.
  </div>

  <div class="rule">
    <b>No skip-links</b> — a blog post never links straight to a pillar past its cluster; a cluster never links straight to master past its pillar.<br>
    <b>Lateral links are the exception</b> — two are confirmed: JAI ↔ Embedded Intelligence &amp; AI, and Source-to-Pay's role as suite overview (see below). Any other cross-pillar link needs the same explicit confirmation.
  </div>

  <h2>How to read the cross-cutting layer</h2>
  <p>Verticals, Roles, and Needs aren't a 7th tier sitting below the pillars — they're a horizontal layer that cuts across all 6 at once, built around <i>who's asking</i> or <i>why</i>, not around a product line. That's what "cross-cutting" means here: each of these pages exists independently of the pillar hierarchy and reaches into it only where relevance is real.</p>
  <div class="rule">
    <b>Don't ask</b> "which tier does this page belong to" — a vertical/role/need page doesn't have one parent pillar the way a cluster does.<br>
    <b>Do ask</b>, for each cross-cutting page, one at a time: "which pillars actually solve this audience's or this need's problem?" Link only to those.<br><br>
    <b>Worked example — Healthcare (vertical):</b> a hospital buyer cares about supplier compliance and invoicing controls, so Healthcare links to Supplier Management Software and Procure-to-Pay. It has no real reason to link to Source-to-Contract's Category Management cluster, so it doesn't.<br><br>
    <b>Worked example — Spend Visibility (need):</b> this is squarely a Spend Analytics problem, so it links into Source-to-Contract's Spend Analytics cluster directly (not just the pillar) — plus AI in Procurement, since that's the mechanism increasingly used to surface visibility.<br><br>
    <b>Result</b>: most cross-cutting pages link into 1-3 pillars, never all 6. A cross-cutting page that ends up linking into 5 or 6 pillars is a sign the relevance mapping was skipped, not that the page is unusually well-connected.
  </div>

  <h2>Full map</h2>

  <div class="box master">jaggaer.com — master pillar<span class="url">primary keyword: source to pay</span></div>

  <div class="chart">

    <div class="col">
      <div class="box root">Source-to-Pay<span class="url">/solutions/source-to-pay</span></div>
      <div class="connector"></div>
      <div class="stack">
        <div class="leaf" style="font-style:italic;color:var(--sub);">Suite overview — its "clusters" are direct links to all 5 sibling pillars, not separate sub-pages</div>
        <div class="leaf">↔ Source-to-Contract</div>
        <div class="leaf">↔ Procure-to-Pay</div>
        <div class="leaf">↔ Supplier Management Software</div>
        <div class="leaf">↔ Procurement Orchestration Platform</div>
        <div class="leaf">↔ AI in Procurement</div>
      </div>
    </div>

    <div class="col">
      <div class="box root">Source-to-Contract<span class="url">/solutions/source-to-contract</span></div>
      <div class="connector"></div>
      <div class="stack">
        <div class="leaf">Spend Analytics</div>
        <div class="leaf">Category Management</div>
        <div class="branch"><div class="label">↳ sub-cluster</div><div class="leaf">Category Intelligence</div></div>
        <div class="leaf">Sourcing</div>
        <div class="branch"><div class="label">↳ sub-clusters</div><div class="leaf">Sourcing Optimization</div><div class="leaf">Rates Management</div></div>
        <div class="leaf">Contract Management</div>
        <div class="branch"><div class="label">↳ sub-cluster</div><div class="leaf">Contracts AI</div></div>
      </div>
    </div>

    <div class="col">
      <div class="box root">Procure-to-Pay<span class="url">/solutions/procure-to-pay</span></div>
      <div class="connector"></div>
      <div class="stack">
        <div class="leaf">Procurement Software</div>
        <div class="leaf">eProcurement (canonical)</div>
        <div class="leaf">Supply Chain Collaboration</div>
        <div class="branch"><div class="label">↳ sub-cluster</div><div class="leaf">Quality Management</div></div>
        <div class="leaf">Invoicing</div>
        <div class="branch"><div class="label">↳ sub-clusters</div><div class="leaf">Autonomous AP</div><div class="leaf">Digital Capture</div><div class="leaf">Digital Mailroom</div><div class="leaf">Global eInvoicing Compliance</div></div>
        <div class="leaf">Payments</div>
        <div class="leaf">Research Material Management</div>
      </div>
    </div>

    <div class="col">
      <div class="box root">AI in Procurement<span class="url">/need/ai-in-procurement</span></div>
      <div class="connector"></div>
      <div class="stack">
        <div class="leaf">JAI ↔ links to Pillar 6</div>
      </div>
    </div>

    <div class="col">
      <div class="box root">Supplier Management Software<span class="url">/solutions/supplier-intelligence</span></div>
      <div class="connector"></div>
      <div class="stack">
        <div class="leaf">Supplier Network</div>
        <div class="leaf">Supplier Identity Management</div>
      </div>
    </div>

    <div class="col">
      <div class="box root">Procurement Orchestration Platform<span class="url">/solutions/procurement-orchestration</span></div>
      <div class="connector"></div>
      <div class="stack">
        <div class="leaf">Connect</div>
        <div class="leaf">Security &amp; Compliance</div>
        <div class="leaf">Embedded Intelligence &amp; AI ↔ links to Pillar 4</div>
      </div>
    </div>

  </div>

  <h2>Cross-cutting layer</h2>
  <p>Feeds sideways into the pillars above — a Vertical/Role/Need page links only into the pillar(s) it's genuinely relevant to, never all six by default.</p>
  <div class="chart">

    <div class="col" style="min-width:230px;">
      <div class="box cross-root">By Industry</div>
      <div class="connector"></div>
      <div class="stack">
        <div class="leaf">Consumer Goods</div>
        <div class="leaf">Energy</div>
        <div class="leaf">Healthcare</div>
        <div class="leaf">Pharma / Life Sciences</div>
        <div class="leaf">Education</div>
        <div class="leaf">Automotive</div>
        <div class="leaf" style="font-style:italic;color:var(--sub);">+ ~10 more, queued</div>
      </div>
    </div>

    <div class="col">
      <div class="box cross-root">By Role</div>
      <div class="connector"></div>
      <div class="stack">
        <div class="leaf">Procurement</div>
        <div class="leaf">Finance</div>
        <div class="leaf">Information Technology</div>
        <div class="leaf">Supply Chain</div>
      </div>
    </div>

    <div class="col">
      <div class="box cross-root">By Need</div>
      <div class="connector"></div>
      <div class="stack">
        <div class="leaf">Spend Visibility</div>
        <div class="leaf">Direct Procurement</div>
        <div class="leaf">Reduce Cost</div>
        <div class="leaf">Supplier Compliance</div>
        <div class="leaf">Procurement Profitability</div>
        <div class="leaf">Integration into Business System Landscape</div>
      </div>
    </div>

  </div>

</div>
</body>
</html>
`;

function ArchitectureMapPanel() {
  const frameRef = useArchMapRef(null);
  function fitToContent() {
    try {
      const f = frameRef.current;
      const doc = f && f.contentWindow && f.contentWindow.document;
      if (doc && doc.documentElement) {
        f.style.height = (doc.documentElement.scrollHeight + 24) + "px";
      }
    } catch (e) {}
  }
  return (
    <div style={{ height: "100%", overflow: "auto", background: "#faf9f6" }}>
      <iframe
        ref={frameRef}
        title="JAGGAER pillar/cluster architecture"
        onLoad={fitToContent}
        srcDoc={ARCH_MAP_HTML}
        style={{ width: "100%", border: "none", display: "block", minHeight: "600px" }}
      />
    </div>
  );
}
