#!/usr/bin/env python3
"""
Seed script for Ideas Hub test data.

This script deletes all existing ideas and creates 15 realistic German test ideas
in the SUBMITTED status for testing the Ideas Hub workflow.

Usage:
    python scripts/seed_ideas.py

Environment variables required:
    - AZURE_COSMOS_ENDPOINT: Cosmos DB endpoint
    - AZURE_COSMOS_KEY: Cosmos DB key (or use managed identity)
    - AZURE_IDEAS_DATABASE: Database name
    - AZURE_IDEAS_CONTAINER: Container name (default: ideas)
"""

import asyncio
import os
import sys
import time
import uuid
from typing import Any

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app", "backend"))

# Load environment variables from azd
from load_azd_env import load_azd_env
load_azd_env()

from azure.cosmos.aio import CosmosClient
from azure.identity.aio import DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI

from ideas.models import IdeaStatus
from ideas.service import IdeasService


# 15 realistic German test ideas in SUBMITTED status
TEST_IDEAS: list[dict[str, Any]] = [
    {
        "title": "Digitale Urlaubsantraege mit automatischer Vertretungsregelung",
        "description": "Einfuehrung eines digitalen Systems fuer Urlaubsantraege, das automatisch die Vertretung regelt und den Vorgesetzten zur Genehmigung benachrichtigt. Das System prueft automatisch Teamkalender auf Konflikte und schlaegt alternative Termine vor.",
        "problem_description": "Urlaubsantraege werden aktuell per E-Mail oder Papierformular gestellt. Die Abstimmung der Vertretung erfolgt muendlich und wird oft vergessen. Bei Abwesenheit des Vorgesetzten verzoegert sich die Genehmigung um Tage.",
        "expected_benefit": "Reduzierung der Bearbeitungszeit von 3 Tagen auf wenige Stunden, lueckenlose Vertretungsregelung und vollstaendige Transparenz ueber Abwesenheiten im Team.",
        "affected_processes": ["Urlaubsverwaltung", "Personalwesen", "Teamkoordination"],
        "target_users": ["Alle Mitarbeiter", "Fuehrungskraefte", "HR-Abteilung"],
        "department": "HR",
        "tags": ["digitalisierung", "hr", "automatisierung", "self-service"],
    },
    {
        "title": "Intelligente Besprechungsraum-Buchung mit Auslastungsoptimierung",
        "description": "Implementierung eines intelligenten Buchungssystems fuer Besprechungsraeume mit Outlook-Integration. Das System erkennt ungenutzte Buchungen automatisch und gibt diese nach 15 Minuten frei. Zusaetzlich werden Raumgroesse und Teilnehmerzahl optimiert.",
        "problem_description": "Besprechungsraeume sind oft gebucht aber leer. Mitarbeiter buchen grosse Raeume fuer kleine Meetings. Es gibt keine Uebersicht ueber die tatsaechliche Auslastung und haeufig Doppelbuchungen.",
        "expected_benefit": "Steigerung der Raumauslastung um 40%, Eliminierung von Geisterbuchungen und bessere Planbarkeit fuer alle Mitarbeiter.",
        "affected_processes": ["Raumverwaltung", "Meeting-Planung", "Facility Management"],
        "target_users": ["Alle Mitarbeiter", "Facility Management", "Assistenzen"],
        "department": "Operations",
        "tags": ["facilities", "automatisierung", "produktivitaet"],
    },
    {
        "title": "Zentrales Wissensmanagement-Portal mit KI-Suche",
        "description": "Aufbau einer zentralen Wissensplattform, die alle Dokumentationen, FAQs, Prozessbeschreibungen und Best Practices buendelt. Eine KI-gestuetzte Suche findet relevante Informationen auch bei unpraezisen Suchanfragen.",
        "problem_description": "Wissen ist verstreut in E-Mails, SharePoint, lokalen Laufwerken und in den Koepfen einzelner Mitarbeiter. Neue Kollegen brauchen Monate, um sich zurechtzufinden. Bei Kuendigungen geht wertvolles Wissen verloren.",
        "expected_benefit": "Reduzierung der Einarbeitungszeit um 50%, schnelleres Finden von Informationen und nachhaltige Wissenssicherung unabhaengig von einzelnen Personen.",
        "affected_processes": ["Wissensmanagement", "Onboarding", "Dokumentation"],
        "target_users": ["Alle Mitarbeiter", "Neue Mitarbeiter", "Fuehrungskraefte"],
        "department": "IT",
        "tags": ["wissensmanagement", "ki", "dokumentation", "onboarding"],
    },
    {
        "title": "Automatisierte Reisekostenabrechnung per App",
        "description": "Mobile App zur Erfassung von Reisekosten mit Belegfoto, automatischer Kategorisierung und direkter Anbindung an das Buchhaltungssystem. Belege werden per OCR ausgelesen und die Abrechnung automatisch erstellt.",
        "problem_description": "Reisekostenabrechnungen werden manuell in Excel erstellt und mit Papierbelegen eingereicht. Die Bearbeitung dauert 2-3 Wochen, Belege gehen verloren und Rueckfragen verzoegern die Erstattung.",
        "expected_benefit": "Erstattung innerhalb von 5 Werktagen statt 3 Wochen, keine verlorenen Belege mehr und 70% weniger Bearbeitungsaufwand in der Buchhaltung.",
        "affected_processes": ["Reisekostenabrechnung", "Buchhaltung", "Reisemanagement"],
        "target_users": ["Aussendienst", "Vertrieb", "Fuehrungskraefte", "Buchhaltung"],
        "department": "Finance",
        "tags": ["mobile", "automatisierung", "finanzen", "reisekosten"],
    },
    {
        "title": "Digitaler Onboarding-Prozess fuer neue Mitarbeiter",
        "description": "Strukturierter digitaler Onboarding-Prozess mit Checklisten, automatischer Kontoerstellung, Schulungszuweisung und Fortschrittsverfolgung. Neue Mitarbeiter erhalten vor dem ersten Tag Zugang zu allen relevanten Informationen.",
        "problem_description": "Das Onboarding neuer Mitarbeiter ist unstrukturiert und abhaengig vom jeweiligen Vorgesetzten. IT-Zugaenge werden oft erst am ersten Tag beantragt, Schulungen werden vergessen und wichtige Informationen fehlen.",
        "expected_benefit": "Produktivitaet neuer Mitarbeiter ab Tag 1, einheitliche Qualitaet des Onboardings und Reduzierung der Einarbeitungszeit um 40%.",
        "affected_processes": ["Onboarding", "IT-Bereitstellung", "Personalwesen", "Schulung"],
        "target_users": ["Neue Mitarbeiter", "HR-Abteilung", "Fuehrungskraefte", "IT-Abteilung"],
        "department": "HR",
        "tags": ["onboarding", "automatisierung", "hr", "mitarbeitererfahrung"],
    },
    {
        "title": "Self-Service IT-Portal fuer Standardanfragen",
        "description": "Webportal fuer haeufige IT-Anfragen wie Passwort-Reset, Software-Installation, Hardwarebestellung und Berechtigungsantraege. Standardanfragen werden automatisch bearbeitet, komplexe Faelle an den Support weitergeleitet.",
        "problem_description": "Der IT-Helpdesk ist ueberlastet mit Routineanfragen. Mitarbeiter warten oft Tage auf einfache Aenderungen wie Passwort-Resets oder Softwareinstallationen. Die Ticketbearbeitung ist ineffizient.",
        "expected_benefit": "Sofortige Loesung von 60% aller IT-Anfragen, Entlastung des Helpdesks und hoehere Mitarbeiterzufriedenheit durch schnellere Reaktionszeiten.",
        "affected_processes": ["IT-Support", "Berechtigungsmanagement", "Softwareverteilung"],
        "target_users": ["Alle Mitarbeiter", "IT-Abteilung"],
        "department": "IT",
        "tags": ["self-service", "it", "automatisierung", "helpdesk"],
    },
    {
        "title": "Automatische Rechnungsverarbeitung mit KI",
        "description": "KI-gestuetzte Loesung zur automatischen Erfassung, Validierung und Kontierung eingehender Rechnungen. Das System erkennt Rechnungsdaten per OCR, prueft gegen Bestellungen und leitet zur Freigabe weiter.",
        "problem_description": "Eingehende Rechnungen werden manuell erfasst und kontiert. Bei 500+ Rechnungen monatlich bindet dies erhebliche Kapazitaeten, fuehrt zu Fehlern und verzoegert Zahlungen.",
        "expected_benefit": "80% weniger manueller Aufwand, Reduzierung von Erfassungsfehlern auf unter 1% und Nutzung von Skontofristen durch schnellere Bearbeitung.",
        "affected_processes": ["Kreditorenbuchhaltung", "Einkauf", "Zahlungsverkehr"],
        "target_users": ["Buchhaltung", "Einkauf", "Controlling"],
        "department": "Finance",
        "tags": ["ki", "automatisierung", "finanzen", "rechnungsverarbeitung"],
    },
    {
        "title": "Mitarbeiter-Feedback-System mit anonymer Auswertung",
        "description": "Digitale Plattform fuer regelmaessiges Mitarbeiter-Feedback mit anonymer Auswertung und Trendanalyse. Mitarbeiter koennen Verbesserungsvorschlaege einreichen und die Stimmung im Team wird kontinuierlich erfasst.",
        "problem_description": "Mitarbeiterbefragungen finden nur jaehrlich statt und die Ergebnisse kommen zu spaet. Probleme werden nicht fruehzeitig erkannt, die Fluktuation steigt und wertvolles Feedback geht verloren.",
        "expected_benefit": "Fruehzeitige Erkennung von Problemen, messbare Verbesserung der Mitarbeiterzufriedenheit und datenbasierte Entscheidungen im Personalbereich.",
        "affected_processes": ["Mitarbeiterbefragung", "Personalentwicklung", "Fuehrung"],
        "target_users": ["Alle Mitarbeiter", "Fuehrungskraefte", "HR-Abteilung"],
        "department": "HR",
        "tags": ["feedback", "hr", "mitarbeiterzufriedenheit", "analytics"],
    },
    {
        "title": "Digitale Besucherverwaltung mit Voranmeldung",
        "description": "System zur digitalen Besucheranmeldung mit QR-Code-Check-in, automatischer Benachrichtigung des Gastgebers und Erstellung von Besucherausweisen. Besucher erhalten vorab alle relevanten Informationen per E-Mail.",
        "problem_description": "Besucher muessen am Empfang warten, waehrend der Gastgeber telefonisch gesucht wird. Die Erfassung erfolgt handschriftlich in einem Buch, Datenschutzanforderungen werden nicht erfuellt.",
        "expected_benefit": "Professioneller erster Eindruck, DSGVO-konforme Besuchererfassung und Zeitersparnis fuer Empfang und Gastgeber.",
        "affected_processes": ["Empfang", "Sicherheit", "Besuchermanagement"],
        "target_users": ["Empfang", "Alle Mitarbeiter", "Externe Besucher"],
        "department": "Operations",
        "tags": ["besuchermanagement", "digitalisierung", "sicherheit", "dsgvo"],
    },
    {
        "title": "Automatisierte Vertragsverlaengerungs-Erinnerungen",
        "description": "System zur Ueberwachung aller Vertraege mit automatischen Erinnerungen vor Kuendigungsfristen. Das System erfasst Vertragsdetails, berechnet Fristen und benachrichtigt die Verantwortlichen rechtzeitig.",
        "problem_description": "Vertraege verlaengern sich automatisch zu unguenstigen Konditionen, weil Kuendigungsfristen verpasst werden. Es gibt keine zentrale Uebersicht ueber alle laufenden Vertraege und deren Laufzeiten.",
        "expected_benefit": "Keine verpassten Kuendigungsfristen mehr, bessere Verhandlungsposition bei Verlaengerungen und Kosteneinsparungen durch rechtzeitige Kuendigungen unguenstiger Vertraege.",
        "affected_processes": ["Vertragsmanagement", "Einkauf", "Recht"],
        "target_users": ["Einkauf", "Rechtsabteilung", "Fachabteilungen"],
        "department": "Legal",
        "tags": ["vertragsmanagement", "automatisierung", "compliance", "kosteneinsparung"],
    },
    {
        "title": "Einheitliche Projektstatusberichte mit Dashboard",
        "description": "Standardisierte Projektstatusberichte mit automatischer Datenaggregation aus verschiedenen Systemen. Ein zentrales Dashboard zeigt den Status aller Projekte in Echtzeit mit Ampelsystem und Trendanalyse.",
        "problem_description": "Projektberichte werden manuell in unterschiedlichen Formaten erstellt. Die Geschaeftsfuehrung hat keinen aktuellen Ueberblick ueber den Projektstatus, Probleme werden zu spaet erkannt.",
        "expected_benefit": "Echtzeit-Transparenz ueber alle Projekte, fruehzeitige Erkennung von Risiken und 80% weniger Aufwand fuer die Berichtserstellung.",
        "affected_processes": ["Projektmanagement", "Reporting", "Controlling"],
        "target_users": ["Projektleiter", "Geschaeftsfuehrung", "Controlling"],
        "department": "PMO",
        "tags": ["projektmanagement", "reporting", "dashboard", "transparenz"],
    },
    {
        "title": "Digitale Schichtplanung mit Mitarbeiter-Self-Service",
        "description": "Digitales Schichtplanungssystem mit Moeglichkeit zum Schichttausch zwischen Mitarbeitern, Wunschdienstplanung und automatischer Beruecksichtigung von Qualifikationen und Arbeitszeitgesetzen.",
        "problem_description": "Schichtplaene werden in Excel erstellt und per Aushang kommuniziert. Schichttausch erfordert manuelle Abstimmung mit dem Vorgesetzten, Aenderungen werden oft nicht rechtzeitig kommuniziert.",
        "expected_benefit": "Flexiblere Arbeitszeiten fuer Mitarbeiter, 50% weniger Planungsaufwand und automatische Einhaltung aller gesetzlichen Vorgaben.",
        "affected_processes": ["Schichtplanung", "Arbeitszeiterfassung", "Personalplanung"],
        "target_users": ["Schichtarbeiter", "Teamleiter", "HR-Abteilung"],
        "department": "Operations",
        "tags": ["schichtplanung", "self-service", "arbeitszeit", "flexibilitaet"],
    },
    {
        "title": "Zentrales Lieferanten-Bewertungssystem",
        "description": "Digitale Plattform zur systematischen Bewertung von Lieferanten nach Qualitaet, Liefertreue, Preis und Service. Automatische Auswertungen zeigen Trends und unterstuetzen Einkaufsentscheidungen.",
        "problem_description": "Lieferantenbewertungen erfolgen sporadisch und subjektiv. Es gibt keine einheitlichen Kriterien und keine historischen Daten fuer Verhandlungen oder Lieferantenauswahl.",
        "expected_benefit": "Objektive Lieferantenauswahl, bessere Verhandlungsposition durch Daten und fruehzeitige Erkennung von Qualitaetsproblemen.",
        "affected_processes": ["Lieferantenmanagement", "Einkauf", "Qualitaetssicherung"],
        "target_users": ["Einkauf", "Qualitaetsmanagement", "Fachabteilungen"],
        "department": "Supply Chain",
        "tags": ["lieferanten", "bewertung", "einkauf", "qualitaet"],
    },
    {
        "title": "Automatisierte Gehaltsabrechnung mit Employee-Self-Service",
        "description": "Modernisierung der Gehaltsabrechnung mit automatischer Beruecksichtigung von Ueberstunden, Zulagen und Abwesenheiten. Mitarbeiter koennen ihre Abrechnungen digital einsehen und Stammdaten selbst pflegen.",
        "problem_description": "Die Gehaltsabrechnung erfordert viele manuelle Eingaben und Pruefungen. Mitarbeiter erhalten Papierabrechnungen und muessen fuer jede Aenderung die HR-Abteilung kontaktieren.",
        "expected_benefit": "Fehlerfreie Abrechnungen, 60% weniger Rueckfragen an HR und hohe Mitarbeiterzufriedenheit durch Transparenz und Self-Service.",
        "affected_processes": ["Gehaltsabrechnung", "Personalverwaltung", "Zeiterfassung"],
        "target_users": ["Alle Mitarbeiter", "HR-Abteilung", "Buchhaltung"],
        "department": "HR",
        "tags": ["gehaltsabrechnung", "self-service", "hr", "automatisierung"],
    },
    {
        "title": "Energie-Monitoring und Optimierung fuer Gebaeude",
        "description": "Installation von Smart Metern und Sensoren zur Echtzeit-Ueberwachung des Energieverbrauchs. Ein Dashboard zeigt Verbrauchsmuster und identifiziert Einsparpotenziale automatisch.",
        "problem_description": "Der Energieverbrauch wird nur monatlich ueber die Rechnung erfasst. Es gibt keine Transparenz ueber Verbrauchsspitzen oder ineffiziente Geraete. Energiekosten steigen kontinuierlich.",
        "expected_benefit": "15-20% Reduzierung der Energiekosten, Beitrag zu Nachhaltigkeitszielen und fruehzeitige Erkennung von Defekten an Anlagen.",
        "affected_processes": ["Facility Management", "Nachhaltigkeit", "Kostencontrolling"],
        "target_users": ["Facility Management", "Geschaeftsfuehrung", "Nachhaltigkeitsbeauftragte"],
        "department": "Operations",
        "tags": ["energie", "nachhaltigkeit", "iot", "kosteneinsparung"],
    },
]


# Submitter names for variety
SUBMITTER_NAMES = [
    "Anna Mueller", "Thomas Schmidt", "Maria Weber", "Michael Fischer", "Julia Wagner",
    "Stefan Becker", "Laura Hoffmann", "Markus Schulz", "Sophie Koch", "Daniel Richter",
    "Emma Bauer", "Felix Wolf", "Lena Schroeder", "Maximilian Neumann", "Hannah Schwarz"
]



async def delete_all_ideas(container) -> int:
    """
    Delete all existing ideas from the container.

    Args:
        container: Cosmos DB container client.

    Returns:
        Number of deleted ideas.
    """
    query = "SELECT c.id, c.ideaId FROM c WHERE c.type = 'idea'"
    items = container.query_items(query=query)

    deleted_count = 0
    async for item in items:
        try:
            await container.delete_item(item=item["id"], partition_key=item["ideaId"])
            deleted_count += 1
            print(f"  Geloescht: {deleted_count}")
        except Exception as e:
            print(f"  Fehler beim Loeschen: {e}")

    return deleted_count


async def seed_ideas():
    """
    Delete all existing ideas and seed the database with 15 new German test ideas.

    All ideas are created in SUBMITTED status without scores or analysis.
    """
    # Get environment variables - use same pattern as chat_history/cosmosdb.py
    cosmos_account = os.getenv("AZURE_COSMOSDB_ACCOUNT")
    # Use AZURE_IDEAS_DATABASE if set, otherwise fall back to AZURE_CHAT_HISTORY_DATABASE
    database_name = os.getenv("AZURE_IDEAS_DATABASE") or os.getenv("AZURE_CHAT_HISTORY_DATABASE")
    container_name = os.getenv("AZURE_IDEAS_CONTAINER", "ideas")

    # Azure OpenAI configuration for embedding generation
    azure_openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    embedding_deployment = os.getenv(
        "AZURE_OPENAI_EMB_DEPLOYMENT", "text-embedding-ada-002"
    )

    if not cosmos_account:
        print("Fehler: AZURE_COSMOSDB_ACCOUNT Umgebungsvariable fehlt")
        sys.exit(1)

    if not database_name:
        print("Fehler: AZURE_IDEAS_DATABASE oder AZURE_CHAT_HISTORY_DATABASE Umgebungsvariable fehlt")
        sys.exit(1)

    cosmos_endpoint = f"https://{cosmos_account}.documents.azure.com:443/"
    print(f"Verbinde mit Cosmos DB: {cosmos_endpoint}")
    print(f"Datenbank: {database_name}, Container: {container_name}")

    # Create credential for Azure services
    azure_credential = DefaultAzureCredential()

    # Create OpenAI client for embedding generation
    openai_client = None
    if azure_openai_endpoint:
        print(f"Verwende Azure OpenAI: {azure_openai_endpoint}")
        print(f"Embedding Deployment: {embedding_deployment}")
        token_provider = get_bearer_token_provider(
            azure_credential, "https://cognitiveservices.azure.com/.default"
        )
        openai_client = AsyncAzureOpenAI(
            azure_endpoint=azure_openai_endpoint,
            azure_ad_token_provider=token_provider,
            api_version="2024-02-15-preview",
        )
    else:
        print("Warnung: AZURE_OPENAI_ENDPOINT nicht gesetzt - keine Embeddings")

    # Create Cosmos client using DefaultAzureCredential
    print("Verwende DefaultAzureCredential fuer Cosmos DB")
    client = CosmosClient(cosmos_endpoint, credential=azure_credential)

    # Create IdeasService for embedding generation
    ideas_service = None
    if openai_client:
        ideas_service = IdeasService(
            openai_client=openai_client,
            embedding_deployment=embedding_deployment,
        )

    try:
        # Get database and container
        database = client.get_database_client(database_name)
        container = database.get_container_client(container_name)

        # Delete all existing ideas first
        print("\n--- Loesche alle bestehenden Ideen ---")
        deleted_count = await delete_all_ideas(container)
        print(f"Geloescht: {deleted_count} Ideen\n")

        # Create new ideas
        print("--- Erstelle 15 neue deutsche Ideen ---")
        created_count = 0
        embedding_count = 0
        base_time = int(time.time() * 1000)

        for i, idea_data in enumerate(TEST_IDEAS):
            # Create unique ID and timestamps
            idea_id = str(uuid.uuid4())
            # Spread creation times over the last 14 days
            created_at = base_time - (i * 24 * 60 * 60 * 1000)  # 1 day apart
            updated_at = created_at

            # Assign submitter
            submitter_name = SUBMITTER_NAMES[i % len(SUBMITTER_NAMES)]
            submitter_id = f"user_{submitter_name.lower().replace(' ', '_')}@company.com"

            # Use department from idea data
            department = idea_data.get("department", "IT")

            # Generate embedding for semantic similarity search
            embedding = []
            if ideas_service:
                try:
                    text_for_embedding = (
                        f"{idea_data['title']}\n\n"
                        f"{idea_data['description']}\n\n"
                        f"{idea_data.get('problem_description', '')}"
                    )
                    embedding = await ideas_service.generate_embedding(text_for_embedding)
                    if embedding:
                        embedding_count += 1
                except Exception as e:
                    print(f"  Warnung: Embedding-Generierung fehlgeschlagen: {e}")

            # Create the Cosmos DB document - all in SUBMITTED status without scores
            cosmos_item = {
                "id": idea_id,
                "ideaId": idea_id,
                "type": "idea",
                "submitterId": submitter_id,
                "submitterName": submitter_name,
                "title": idea_data["title"],
                "description": idea_data["description"],
                "problemDescription": idea_data.get("problem_description", ""),
                "expectedBenefit": idea_data.get("expected_benefit", ""),
                "affectedProcesses": idea_data.get("affected_processes", []),
                "targetUsers": idea_data.get("target_users", []),
                "department": department,
                "status": IdeaStatus.SUBMITTED.value,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "summary": "",
                "tags": idea_data.get("tags", []),
                "embedding": embedding,
                "impactScore": None,
                "feasibilityScore": None,
                "recommendationClass": None,
                "kpiEstimates": {},
                "clusterLabel": "",
                "analyzedAt": None,
                "analysisVersion": None,
            }

            try:
                await container.create_item(body=cosmos_item)
                created_count += 1
                print(f"  [{created_count}/{len(TEST_IDEAS)}] {idea_data['title'][:60]}...")
            except Exception as e:
                print(f"  Fehler: {idea_data['title']}: {e}")

            # Small delay to avoid rate limiting on embedding API
            if ideas_service:
                await asyncio.sleep(0.2)

        print(f"\n--- Zusammenfassung ---")
        print(f"Erstellt: {created_count} Ideen im Status SUBMITTED")
        print(f"Embeddings generiert: {embedding_count}")
        print(f"\nAlle Ideen warten auf LLM-Review!")

    finally:
        await client.close()
        if openai_client:
            await openai_client.close()
        if azure_credential:
            await azure_credential.close()


def main():
    """Main entry point."""
    print("=== Ideas Hub Seed Script ===")
    print("Dieses Script loescht alle bestehenden Ideen und erstellt 15 neue deutsche Test-Ideen.\n")
    asyncio.run(seed_ideas())


if __name__ == "__main__":
    main()

