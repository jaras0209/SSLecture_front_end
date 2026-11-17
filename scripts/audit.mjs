/* global process, console */
/**
 * Fail on known high or critical vulnerabilities in the packages the site uses
 * (npm audit --omit=dev), except advisories listed in .github/audit-exceptions.json.
 *
 * npm audit can't skip a single advisory, and one sometimes appears before any fixed
 * version exists. Each exception names its advisory, says why it is acceptable, and
 * expires: after that date the check fails again, so it gets looked at again.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const FAIL_AT = new Set(['high', 'critical'])
const today = new Date().toISOString().slice(0, 10)

let output
try {
  output = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' })
} catch (err) {
  output = err.stdout // npm audit exits non-zero whenever it finds anything
}
let report
try {
  report = JSON.parse(output)
} catch {
  console.error('npm audit gave no report:\n' + output)
  process.exit(1)
}
if (report.error) {
  console.error('npm audit failed:', report.error.summary ?? report.error)
  process.exit(1)
}

const exceptions = JSON.parse(readFileSync('.github/audit-exceptions.json', 'utf8'))
const exceptionById = new Map(exceptions.map((e) => [e.id, e]))

// Each advisory once (npm lists it under every package that depends on it)
const advisories = new Map()
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via !== 'object' || !FAIL_AT.has(via.severity)) continue
    const id = via.url?.split('/').pop() ?? String(via.source)
    advisories.set(id, {
      id,
      name: via.name,
      title: via.title,
      severity: via.severity,
      url: via.url
    })
  }
}

let failed = false
for (const a of advisories.values()) {
  const exception = exceptionById.get(a.id)
  const line = `${a.severity} ${a.name}: ${a.title} (${a.url})`
  if (!exception) {
    console.error(`✗ ${line}`)
    failed = true
  } else if (exception.expires < today) {
    console.error(`✗ ${line}\n  The exception expired on ${exception.expires}: check it again.`)
    failed = true
  } else {
    console.log(`– ${line}\n  Allowed until ${exception.expires}: ${exception.reason}`)
  }
}
for (const e of exceptions) {
  if (!advisories.has(e.id)) {
    console.log(`::notice::${e.id} (${e.package}) is no longer reported: remove its exception.`)
  }
}

if (failed) {
  console.error(
    '\nFix these (npm audit fix, or update the package), or, if one is not a risk here,'
  )
  console.error('add it to .github/audit-exceptions.json with the reason and an expiry date.')
  process.exit(1)
}
console.log(
  `No high or critical vulnerabilities to fix (${advisories.size} allowed by an exception).`
)
