# Ideas Hub - leicht erklaert (auch fuer 8-Jaehrige)

**Kurz gesagt:** Der Ideas Hub ist eine digitale Ideen-Kiste. Eine KI schaetzt zu jeder Idee Zahlen, der Computer rechnet daraus Noten, und eine bunte Landkarte (Portfolio-Matrix) zeigt, ob die Idee ein **Quick Win**, **High Leverage**, **Strategic** oder **Evaluate**-Fall ist.

- **Wer bewertet?** Menschen geben die Idee ein, eine KI schaetzt die Kennzahlen (KPIs), der Python-Scorer (`app/backend/ideas/scoring.py`) rechnet die Noten und Kategorie.
- **Wann wird bewertet?** Sofort, wenn eine Idee analysiert wird, und spaeter automatisch neu, wenn sich Daten aendern oder der Scheduler ein Re-Scoring startet.
- **Warum wird bewertet?** Damit man fair und schnell sieht, welche Ideen zuerst gemacht werden sollten.
- **Wie wird bewertet?** Zwei Noten (Impact = Nutzen, Feasibility = Machbarkeit) auf 0-100 werden berechnet, danach entscheidet eine feste Schwelle (70/50/70), in welche der 4 Kategorien die Idee faellt. Fehlende KPIs zaehlen gar nicht mit (sie sind weder plus noch minus).

## 1. Was ist der "Ideas Hub" und die Portfolio-Matrix? (kindgerecht)

Stell dir vor, ihr habt in der Schule eine grosse "Ideen-Kiste".
Alle Kinder duerfen Zettel mit Ideen einwerfen: "Neuer Schulgarten", "Lese-Ecke", "Roboter-AG", usw.

Der **Ideas Hub** ist wie diese Ideen-Kiste - nur auf dem Computer:
- Menschen aus der Firma schreiben ihre Ideen in ein Formular.
- Das System sammelt alle Ideen.
- Dann hilft das System, zu entscheiden:
  - Welche Idee bringt **viel Nutzen**?
  - Welche Idee ist **leicht umzusetzen**?
  - Welche **Ideen sollten wir zuerst machen**?

Dafuer gibt es die **Portfolio-Matrix**:
- Eine Art **Landkarte** mit zwei Richtungen:
  - **Nach oben**: Wie gross ist der **Nutzen/Impact**? (z. B. wie sehr hilft die Idee?)
  - **Nach rechts**: Wie gut ist die **Machbarkeit/Feasibility**? (z. B. wie leicht ist sie umzusetzen?)
- Jede Idee ist ein **Punkt** auf dieser Landkarte.
- Die Farbe des Punkts sagt, in welche der 4 Kategorien die Idee faellt:
  - Quick Win
  - High Leverage
  - Strategic
  - Evaluate

**Ablauf in 4 Schritten (wie ein Fluss):**
1. Idee wird eingegeben.
2. Eine KI schaetzt die Kennzahlen (KPIs).
3. Der Scorer rechnet zwei Noten (Nutzen & Machbarkeit) und waehlt eine Kategorie.
4. Die Portfolio-Matrix zeigt die Punkte in der passenden Farbe.

---

## 2. Wie werden die Bewertungen durchgefuehrt? (Was macht das System genau?)

Im Hintergrund gibt es im Backend die Datei `app/backend/ideas/scoring.py`.
Dort ist ein "Rechenknecht" (eine Python-Klasse namens `IdeaScorer`), der fuer jede Idee **Zahlen** ausrechnet.

**Mini-Ueberblick der Berechnungsschritte:**
1. KPIs einsammeln (Nutzen- und Aufwands-Schaetzungen).
2. Impact-Note (Nutzen) berechnen.
3. Feasibility-Note (Machbarkeit) berechnen.
4. Mit festen Schwellen (70/50/70) in eine Kategorie einteilen.

### 2.1. Schritt 1: Kennzahlen (KPIs) sammeln

Fuer jede Idee schaut das System auf sogenannte **KPIs** (Kennzahlen):

**Impact (Nutzen) - diese Kennzahlen fliessen in den Nutzen-Score ein:**

| Kennzahl | Beschreibung | Wertebereich | Gewicht |
|----------|--------------|--------------|---------|
| `timeSavingsHours` | Wie viele Stunden kann man pro Monat sparen? | 0-500 Stunden | 20% |
| `costReductionEur` | Wie viel Geld kann man pro Jahr sparen? | 0-500.000 EUR | 25% |
| `qualityImprovementPercent` | Wird die Qualitaet besser? (z. B. weniger Fehler) | 0-100% | 20% |
| `employeeSatisfactionImpact` | Werden die Mitarbeitenden gluecklicher? | -100 bis +100 | 15% |
| `scalabilityPotential` | Kann man die Idee auf viele Teams ausweiten? | 0-100 | 20% |

**Feasibility (Machbarkeit) - diese Kennzahlen fliessen in den Machbarkeits-Score ein:**

| Kennzahl | Beschreibung | Wertebereich | Gewicht |
|----------|--------------|--------------|---------|
| `implementationEffortDays` | Wie viele Tage Arbeit braucht man? | 1-365 Tage | 35% |
| `riskLevel` | Wie riskant ist die Idee? | low/medium/high | 35% |
| Complexity (berechnet) | Wie "anstrengend" ist die Idee insgesamt? | (aus Aufwand + Risiko) | 30% |

**Risiko-Punkte:**
- `low` (niedriges Risiko) = 100 Punkte
- `medium` (mittleres Risiko) = 50 Punkte
- `high` (hohes Risiko) = 10 Punkte
- Falls `riskLevel` fehlt/unklar ist, nimmt der Code automatisch **medium = 50 Punkte**.

**Wichtig zu Bereichs-Grenzen und fehlenden Werten (genau wie im Code):**
- Jeder KPI wird erst **eingeklemmt** in den erlaubten Bereich (z. B. maximal 500 Stunden, 500.000 EUR, 365 Tage).
- Wenn ein KPI **fehlt**, wird er einfach **nicht mitgezaehlt** (kein Extra-Null-Abzug, Gewicht zaehlt dann nicht).

Im Service (`app/backend/ideas/service.py`) passiert folgendes:
1. `idea.kpi_estimates = await self.extract_kpis(idea)` - Eine KI liest den Text der Idee und schaetzt diese Kennzahlen.
2. `impact, feasibility, recommendation = self.scorer.calculate_scores(idea.kpi_estimates)` - Der Scorer berechnet die Punkte.

### 2.2. Schritt 2: Impact-Score (Nutzen) berechnen

Der Impact-Score geht von **0 bis 100**.
Hohe Zahl = grosser Nutzen.

Das System macht das so:
1. Es nimmt jede Kennzahl (z. B. Zeitersparnis in Stunden).
2. Es bringt sie auf eine Skala von **0 bis 100** (normalisieren).
3. Es multipliziert jede Kennzahl mit ihrem **Gewicht** (siehe Tabelle oben).
4. Am Ende rechnet es alles zusammen und bekommt einen **Impact-Score**, z. B. 82 von 100.
5. Fehlt eine Kennzahl, wird sie ignoriert (Gewicht zaehlt dann nicht mit).

Du kannst dir das vorstellen wie eine **Zeugnis-Note**:
- Jede einzelne "Fach-Note" (Zeitersparnis, Kosten, Qualitaet, ...) zaehlt anders stark.
- Am Ende bekommst du eine **Gesamtnote Impact**.

**Mini-Beispiel:**
- 250 Stunden Zeitersparnis liegen in der Mitte des Bereichs (0-500) -> ca. 50 Punkte.
- 250.000 EUR Kostenersparnis sind auch in der Mitte (0-500.000) -> ca. 50 Punkte.
- Wenn mehrere Kennzahlen so mittel sind, ergibt sich eine Impact-Note irgendwo um die 50 herum.

### 2.3. Schritt 3: Feasibility-Score (Machbarkeit) berechnen

Der Feasibility-Score geht auch von **0 bis 100**.
Hohe Zahl = **leicht umzusetzen**.

Hier macht das System etwas Wichtiges - es **dreht manche Werte um**:

- **Wenig Aufwand** = **gute** (hohe) Punktzahl.
- **Viel Aufwand** = **schlechte** (niedrige) Punktzahl.

Also:
1. `implementationEffortDays` wird "umgedreht" (`invert=True`):
   - 1 Tag Aufwand -> fast 100 Punkte
   - 365 Tage Aufwand -> fast 0 Punkte
2. `riskLevel` wird in eine Punktzahl uebersetzt (siehe Risiko-Punkte oben).
3. Aus Aufwand **und** Risiko baut das System noch eine **Complexity**-Punktzahl (Durchschnitt aus beiden) – **aber nur, wenn beides vorhanden ist**.
4. Wieder werden alle Teile mit **Gewichten** gemischt und zu einem Feasibility-Score zusammengefasst. Fehlt ein KPI, zaehlt sein Gewicht nicht mit.

Das ist wie:
- Wenn eine Aufgabe nur **1 Tag** dauert und **niedriges Risiko** hat, ist sie **leicht** (viele Punkte).
- Wenn sie **ein Jahr** dauert und **hohes Risiko** hat, ist sie **schwer** (wenige Punkte).

**Mini-Beispiel:**
- Aufwand 10 Tage -> sehr gut (hoch) bewertet.
- Risiko "medium" -> 50 Punkte.
- Durchschnitt aus Aufwand-Note und Risiko = Complexity.
- Wenn diese Zahlen alle eher hoch sind, wird die Feasibility-Note hoch (z. B. > 70).
- Wenn Risiko oder Aufwand fehlen, gibt es **keine Complexity** und nur das vorhandene Teil geht in die Note ein.

### 2.4. Schritt 4: Empfehlungsklasse (Kategorie) bestimmen

In `determine_recommendation_class(...)` wird aus den beiden Zahlen eine Kategorie gemacht:

**Die Schwellenwerte:**
- **High Impact**: Impact >= 70
- **Medium Impact**: Impact >= 50
- **High Feasibility**: Feasibility >= 70

**Die Entscheidungslogik (in dieser Reihenfolge):**

1. Wenn **Impact >= 70** UND **Feasibility >= 70**
   -> **High Leverage** (beste Kombination!)

2. Sonst, wenn **Impact >= 70**, aber **Feasibility < 70**
   -> **Strategic** (wichtig, aber schwer)

3. Sonst, wenn **Feasibility >= 70** UND **Impact >= 50**
   -> **Quick Win** (leicht und lohnt sich)

4. Sonst
   -> **Evaluate** (erst mal genauer anschauen)

So wird aus zwei Zahlen (Nutzen & Machbarkeit) eine von 4 Farben/Kategorien.

---

## 3. Wann werden die Bewertungen durchgefuehrt?

Die Bewertungen passieren **automatisch**, an mehreren Stellen:

1. **Wenn eine neue Idee angelegt und analysiert wird**
   Im Backend (`service.py`) wird beim Analysieren einer Idee:
   - Zusammenfassung erstellt
   - Tags erkannt
   - KPIs (Kennzahlen) geschaetzt
   - **Dann** werden Impact & Feasibility & Kategorie berechnet.

2. **Wenn bestehende Ideen neu bewertet werden muessen**
   Im `scheduler.py` gibt es eine Funktion, die Ideen **neu berechnet** ("rescoring"):
   - z. B. wenn sich Rahmenbedingungen aendern
   - oder wenn neue KPI-Schaetzungen vorliegen
   - dann holt sich der Scheduler die Idee, ruft `scorer.calculate_scores(...)` auf und speichert die neuen Werte.

3. **Beim Laden im Frontend**
   Das Frontend (z. B. `IdeaHub.tsx` und `PortfolioMatrix.tsx`) holt die bereits berechneten Werte (`impactScore`, `feasibilityScore`, `recommendationClass`) nur ab und zeichnet sie auf der Matrix.
   Dort wird nichts mehr neu gerechnet, nur angezeigt.

**Heisst:** Sobald eine Idee analysiert oder spaeter neu bewertet wird, landen die frischen Noten automatisch in der Matrix, ohne dass jemand Rechenarbeit machen muss.

---

## 4. Wer fuehrt die Bewertungen durch?

Eigentlich gibt es **zwei "Wer"**:

1. **Menschen / KI schaetzen die KPIs**:
   - Der/die Benutzer:in schreibt die Idee (Titel, Beschreibung, Nutzen, usw.).
   - Ein KI-Teil (in `extract_kpis(...)`) liest diese Beschreibung und macht **Schaetzungen**:
     - Wie viel Zeit koennte das sparen?
     - Wie viel Geld koennte das sparen?
     - Wie schwierig ist das?

2. **Das Backend-System rechnet die Scores aus**:
   - Die Python-Klasse `IdeaScorer` im Backend (`scoring.py`) ist der "Mathe-Lehrer":
     - Sie nimmt die KPI-Zahlen.
     - Sie rechnet Impact-Score, Feasibility-Score und die Kategorie aus.
   - Kein Mensch muss die Noten selbst ausrechnen - das macht der Computer **immer gleich** und **ohne zu vergessen**.
   - Wenn spaeter neue oder bessere KPI-Schaetzungen kommen, wird einfach nochmal gerechnet.

---

## 5. Warum werden die Bewertungen durchgefuehrt?

Stell dir eine Lehrerin vor, die 200 Ideen von Kindern bekommt.
Sie hat nicht die Zeit, alle gleichzeitig umzusetzen.

Mit den Bewertungen will man:

1. **Schnell sehen, welche Ideen sich am meisten lohnen**
   - Hoher Nutzen, hohe Machbarkeit -> sehr interessant.

2. **Eine faire und klare Reihenfolge haben**
   - Statt "Bauchgefuehl" gibt es Zahlen:
     - Wie nuetzlich?
     - Wie aufwendig?

3. **Die richtigen Prioritaeten setzen**
   - Manche Ideen sind perfekt fuer "schnell mal eben".
   - Andere sind grosse Projekte fuer spaeter.

4. **Transparenz schaffen**
   - Jeder sieht in der Portfolio-Matrix:
     - Wo liegt meine Idee?
     - Warum ist sie "Quick Win" oder "Strategic"?

So wird nicht einfach "nach Sympathie" entschieden, sondern nach **klaren, nachvollziehbaren Regeln**.

---

## 6. Was bedeuten die 4 Kategorien genau?

Jetzt die 4 Kategorien so, dass es ein 8-Jaehriger versteht, aber trotzdem genau nach der Logik im Code.

**Merksatz in einem Satz je Kategorie:**
- **Quick Win** = leicht + gut genug -> schnell machen.
- **High Leverage** = sehr nuetzlich + gut machbar -> Top-Prioritaet.
- **Strategic** = sehr nuetzlich + schwer -> planen und in Etappen angehen.
- **Evaluate** = unklar / wenig Nutzen / schwer -> erst mehr Infos holen.

### 6.1. Quick Win (Schneller Gewinn)

**Wann im Code?**
- Feasibility (Machbarkeit) **hoch** (>= 70)
- Impact (Nutzen) **mittel bis gut** (>= 50), aber **nicht schon High Leverage**

**Bedeutung in einfachen Worten:**
- Die Idee ist:
  - **relativ leicht umzusetzen** (braucht nicht viel Zeit/Aufwand).
  - bringt **spuerbaren Nutzen** (aber vielleicht nicht den allergroessten von allen).

**Beispiel:**
- "Wir machen eine Vorlage fuer E-Mails, damit niemand mehr alles neu tippen muss."
  - Leicht zu bauen.
  - Spart vielen Leuten jeden Tag ein bisschen Zeit.
  -> Perfekt, um **gleich loszulegen**.

---

### 6.2. High Leverage (Hohe Hebelwirkung)

**Wann im Code?**
- Impact (Nutzen) **hoch** (>= 70)
- Feasibility (Machbarkeit) **hoch** (>= 70)

**Bedeutung in einfachen Worten:**
- Die Idee ist:
  - **sehr nuetzlich** (macht viel besser/schneller/guenstiger).
  - **noch gut machbar** (kein Monster-Projekt).

**Beispiel:**
- "Wir bauen ein System, das automatisch Routineaufgaben fuer viele Teams erledigt."
  - Riesiger Nutzen.
  - Technisch gut machbar mit vorhandenen Tools.
  -> Hier lohnt es sich richtig, Zeit und Leute reinzustecken.

---

### 6.3. Strategic (Strategisch)

**Wann im Code?**
- Impact (Nutzen) **hoch** (>= 70)
- Feasibility (Machbarkeit) **nicht so hoch** (< 70)

**Bedeutung in einfachen Worten:**
- Die Idee ist:
  - **sehr wertvoll** fuer die Zukunft (passt zur Strategie).
  - **schwierig oder riskant** umzusetzen.

**Beispiel:**
- "Wir bauen eine komplett neue, weltweite Plattform fuer alle Kunden."
  - Wenn es klappt, ist der Nutzen riesig.
  - Sehr viel Arbeit, viele Risiken, viele Abhaengigkeiten.
  -> Man sollte diese Idee **nicht vergessen**, sondern **langfristig planen**:
  - Roadmap, Budget, vielleicht in Phasen aufteilen.

---

### 6.4. Evaluate (Erst pruefen)

**Wann im Code?**
- In allen anderen Faellen, also:
  - Impact eher niedrig (< 50), oder
  - Feasibility niedrig (< 70) und nicht high-impact genug, oder
  - Unklare / fehlende Daten.

**Bedeutung in einfachen Worten:**
- Die Idee ist:
  - Entweder nicht sehr nuetzlich,
  - oder schwer umzusetzen,
  - oder man weiss noch zu wenig darueber.
  - Sie kann spaeter in eine bessere Kategorie rutschen, wenn neue Infos vorliegen.

**Beispiel:**
- "Wir kaufen ein sehr teures Tool, das vielleicht ein bisschen hilft."
  - Nutzen ist unklar.
  - Kosten sind hoch.
  -> Man sollte **erst mehr Informationen sammeln**, bevor man viel Zeit/Geld investiert:
  - Tests,
  - Gespraeche,
  - kleine Experimente.

---

### 6.5. Unclassified (Noch nicht bewertet)

**Wann im Code?**
- Die Idee wurde noch nicht analysiert.
- Es liegen noch keine KPI-Schaetzungen vor.

**Bedeutung:**
- Die Idee ist neu und wartet noch auf die automatische Analyse.
- Sobald die KI die Kennzahlen geschaetzt hat, wird sie in eine der 4 Kategorien einsortiert.

---

## 7. Wie landet das alles in der Portfolio-Matrix im Frontend?

Im Frontend (`PortfolioMatrix.tsx`):

- Jede Idee hat:
  - `impactScore` (Nutzen, 0-100)
  - `feasibilityScore` (Machbarkeit, 0-100)
  - `recommendationClass` (quick_win, high_leverage, strategic, evaluate, unclassified)

Die Matrix macht daraus:

- **X-Achse (rechts)**: Feasibility (je weiter rechts, desto leichter umzusetzen).
- **Y-Achse (oben)**: Impact (je hoeher, desto nuetzlicher).
- **Punkte**: jede Idee als Kreis.
- **Farbe**: je nach Kategorie (jede Kategorie hat eine eigene Farbe).

So sehen Entscheider auf einen Blick:
- Wo sind die **schnellen Gewinne** (Quick Wins)?
- Wo sind die **Top-Ideen** (High Leverage)?
- Wo sind die **grossen, wichtigen Zukunftsprojekte** (Strategic)?
- Wo muessen wir **erst noch genauer hinschauen** (Evaluate)?

---

## 8. Kurzfassung fuer ein 8-jaehriges Kind

1. Menschen schreiben ihre Ideen in ein System (Ideas Hub).
2. Eine KI schaetzt Zahlen: Wie sehr hilft die Idee? Wie schwer ist sie?
3. Der Computer rechnet daraus:
   - eine **Nutzen-Note** (Impact, 0-100),
   - eine **Machbarkeits-Note** (Feasibility, 0-100).
4. Aus diesen beiden Noten macht er eine von 4 **Farben/Kategorien**:
   - **Quick Win** - leicht und lohnt sich -> gleich machen.
   - **High Leverage** - sehr wichtig und gut machbar -> sehr stark bevorzugen.
   - **Strategic** - super wichtig, aber schwer -> langfristig planen.
   - **Evaluate** - unklar / wenig Nutzen / schwer -> erst genauer pruefen.
5. In der Portfolio-Matrix sieht man alle Ideen als Punkte auf einer grossen "Ideen-Landkarte".

---

## 9. Die Entscheidungslogik als Bild

```
                        |
     STRATEGIC          |        HIGH LEVERAGE
     (wichtig, aber     |        (Top-Ideen!)
      schwer)           |
                        |
Impact >= 70 -----------+------------------------
                        |
     EVALUATE           |        QUICK WIN
     (erst pruefen)     |        (schnelle Gewinne)
                        |
                        |
------------------------+------------------------>
                       70              Feasibility
```

Die Grenze bei **Impact = 50** entscheidet zusaetzlich, ob eine Idee mit hoher Machbarkeit
ein "Quick Win" (>= 50) oder "Evaluate" (< 50) wird.
