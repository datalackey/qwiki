/**
 * generate-spike-content.ts
 *
 * Generates a dummy markdown content tree (folder structure + front matter +
 * sample bodies) themed as an animal wiki, for feeding into the
 * markdown -> pandoc -> MediaWiki-XML converter built separately in Claude Code.
 *
 * This is spike/test data only. Content is fictional and only exists to
 * exercise the conversion pipeline (headings, lists, tables, bold text,
 * links, and one "raw" non-pandoc page for MediaWiki:Sidebar).
 *
 * RUN FROM: the directory containing this file (or pass an absolute/relative
 * output path as the first CLI argument). Does NOT auto-cd based on the
 * script's own location -- output path is resolved against process.cwd().
 *
 * Usage:
 *   npx tsx generate-spike-content.ts
 *   npx tsx generate-spike-content.ts ./my-output-dir
 *
 * Re-running this script deterministically overwrites all generated files
 * (full-file overwrite, not incremental patching).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

interface PageSpec {
  relativePath: string;
  title: string;
  categories: string[];
  body: string;
  raw?: boolean;
}

function buildFrontMatter(spec: PageSpec): string {
  const categoryLines: string = spec.categories
    .map((category: string): string => `  - ${category}`)
    .join("\n");

  const rawLine: string = spec.raw === true ? "\nraw: true" : "";

  return [
    "---",
    `title: "${spec.title}"`,
    "categories:",
    categoryLines,
    "redirect_from: []" + rawLine,
    "---",
    "",
  ].join("\n");
}

function writePage(outputRoot: string, spec: PageSpec): void {
  const fullPath: string = join(outputRoot, spec.relativePath);
  const targetDir: string = dirname(fullPath);

  mkdirSync(targetDir, { recursive: true });

  const fileContent: string = buildFrontMatter(spec) + spec.body;

  writeFileSync(fullPath, fileContent, { encoding: "utf8" });
}

const pages: PageSpec[] = [
  {
    relativePath: "system/sidebar.md",
    title: "MediaWiki:Sidebar",
    categories: [],
    raw: true,
    body: [
      "* navigation",
      "** mainpage|mainpage-description",
      "** Evaluation Criteria|Evaluation criteria used across this wiki",
      "** Habitats|Habitats",
      "** Care and Husbandry|Care and husbandry",
      "** Why Animals|Our namesake",
      "* SEARCH",
      "* TOOLBOX",
      "* LANGUAGES",
      "",
    ].join("\n"),
  },
  {
    relativePath: "main-page.md",
    title: "Main Page",
    categories: ["Meta"],
    body: [
      "# Welcome to the Animal Wiki",
      "",
      "A reference handbook for animal habitats and husbandry practices.",
      "",
      "## Domains",
      "",
      "- **[[Habitats]]** — where animals live and how those environments",
      "  are structured",
      "- **[[Care and Husbandry]]** — feeding, health, and daily care",
      "  practices",
      "",
      "See also: [[Evaluation Criteria]], [[Why Animals]]",
      "",
    ].join("\n"),
  },
  {
    relativePath: "evaluation-criteria.md",
    title: "Evaluation Criteria",
    categories: ["Meta"],
    body: [
      "# Evaluation Criteria",
      "",
      "Criteria applied when comparing candidate approaches across this",
      "wiki.",
      "",
      "| Criterion       | Notes                                   |",
      "|------------------|-------------------------------------------|",
      "| Cost             | Ongoing cost to maintain                  |",
      "| Risk             | Failure modes and their consequences      |",
      "| Accessibility    | Ease of adoption by non-experts           |",
      "",
    ].join("\n"),
  },
  {
    relativePath: "why-animals.md",
    title: "Why Animals",
    categories: ["Meta"],
    body: [
      "# Why Animals",
      "",
      "This wiki uses animals as its running example because the subject",
      "matter is low-stakes and easy to reason about while testing the",
      "content pipeline.",
      "",
      "It is **not** connected to any real organization, and no claims in",
      "this wiki should be taken as biologically accurate.",
      "",
    ].join("\n"),
  },
  {
    relativePath: "habitats/forest-habitats/canopy-nesting.md",
    title: "Canopy Nesting",
    categories: ["Habitats", "Forest Habitats"],
    body: [
      "# Canopy Nesting",
      "",
      "## Situation",
      "",
      "Some forest-dwelling species build nests in the upper canopy layer",
      "rather than on the forest floor.",
      "",
      "## Approach",
      "",
      "- Nest placement above 15 meters reduces exposure to ground",
      "  predators",
      "- Structural support is typically drawn from mature branch forks",
      "",
      "## Candidate Species",
      "",
      "1. **Orangutan** (*Pongo* spp.)",
      "   - Why: builds a new nest nightly, favoring flexibility over",
      "     permanence",
      "2. **Bald Eagle** (*Haliaeetus leucocephalus*)",
      "   - Why: reuses and expands a single permanent nest across",
      "     multiple seasons",
      "",
    ].join("\n"),
  },
  {
    relativePath: "habitats/forest-habitats/forest-floor-foraging.md",
    title: "Forest Floor Foraging",
    categories: ["Habitats", "Forest Habitats"],
    body: [
      "# Forest Floor Foraging",
      "",
      "## Situation",
      "",
      "Ground-level foraging trades canopy safety for access to fallen",
      "fruit, fungi, and leaf litter invertebrates.",
      "",
      "## Candidate Species",
      "",
      "1. **Wild Boar** (*Sus scrofa*)",
      "   - Why: rooting behavior accesses subsurface food sources",
      "     unavailable to canopy foragers",
      "",
    ].join("\n"),
  },
  {
    relativePath: "habitats/ocean-habitats.md",
    title: "Ocean Habitats",
    categories: ["Habitats"],
    body: [
      "# Ocean Habitats",
      "",
      "## Description",
      "",
      "Covers open-water and reef-associated habitat types.",
      "",
      "(Content not yet drafted — placeholder page for pipeline testing.)",
      "",
    ].join("\n"),
  },
  {
    relativePath: "care-and-husbandry/nutrition.md",
    title: "Nutrition",
    categories: ["Care and Husbandry"],
    body: [
      "# Nutrition",
      "",
      "## Description",
      "",
      "Dietary requirements vary widely by species; this page tracks",
      "general principles rather than species-specific feeding charts.",
      "",
      "- Ruminants require high-fiber forage",
      "- Obligate carnivores cannot synthesize certain amino acids and",
      "  require animal-sourced protein",
      "",
    ].join("\n"),
  },
  {
    relativePath: "care-and-husbandry/health-monitoring.md",
    title: "Health Monitoring",
    categories: ["Care and Husbandry"],
    body: [
      "# Health Monitoring",
      "",
      "## Description",
      "",
      "Routine indicators used to catch early signs of illness or",
      "distress.",
      "",
      "| Indicator        | Frequency   |",
      "|--------------------|--------------|",
      "| Weight check       | Weekly       |",
      "| Coat/skin condition | Daily       |",
      "",
    ].join("\n"),
  },
];

function main(): void {
  const cliArg: string | undefined = process.argv[2];
  const outputRoot: string =
    cliArg !== undefined
      ? resolve(process.cwd(), cliArg)
      : resolve(process.cwd(), "spike-content");

  for (const spec of pages) {
    writePage(outputRoot, spec);
  }

  console.log(`Generated ${pages.length} pages under: ${outputRoot}`);
}

main();
