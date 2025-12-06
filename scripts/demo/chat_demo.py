#!/usr/bin/env python3
"""
Chat-Demo fuer Azure AI Search mit Service Principal Authentifizierung.
"""

import os
import sys
from pathlib import Path

from azure.core.exceptions import ClientAuthenticationError, HttpResponseError
from azure.identity import ClientSecretCredential
from azure.search.documents import SearchClient


def lade_env_datei() -> None:
    """
    Laedt Umgebungsvariablen aus der .env Datei im gleichen Verzeichnis.
    """
    env_pfad = Path(__file__).parent / ".env"

    if not env_pfad.exists():
        return

    with open(env_pfad, encoding="utf-8") as f:
        for zeile in f:
            zeile = zeile.strip()
            # Leere Zeilen und Kommentare ueberspringen
            if not zeile or zeile.startswith("#"):
                continue
            # KEY=VALUE oder KEY="VALUE" parsen
            if "=" in zeile:
                key, value = zeile.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                # Nur setzen wenn nicht bereits in Umgebung
                if key not in os.environ:
                    os.environ[key] = value


lade_env_datei()

DEFAULT_SEARCH_ENDPOINT = "https://gptkb-vyuvvvwlwg5jo.search.windows.net"
DEFAULT_INDEX_NAME = "gptkbindex"


def lade_umgebungsvariablen() -> dict[str, str]:
    """
    Laedt und validiert die erforderlichen Umgebungsvariablen.
    """
    erforderliche_variablen = [
        "AZURE_TENANT_ID",
        "AZURE_CLIENT_ID",
        "AZURE_CLIENT_SECRET",
    ]

    fehlende = [var for var in erforderliche_variablen if not os.getenv(var)]

    if fehlende:
        print("FEHLER: Folgende Umgebungsvariablen fehlen:")
        for var in fehlende:
            print(f"  - {var}")
        print("\nBitte setze die Variablen oder erstelle eine .env Datei.")
        sys.exit(1)

    return {
        "tenant_id": os.environ["AZURE_TENANT_ID"],
        "client_id": os.environ["AZURE_CLIENT_ID"],
        "client_secret": os.environ["AZURE_CLIENT_SECRET"],
        "search_endpoint": os.getenv("AZURE_SEARCH_ENDPOINT", DEFAULT_SEARCH_ENDPOINT),
        "index_name": os.getenv("AZURE_SEARCH_INDEX", DEFAULT_INDEX_NAME),
    }


def erstelle_search_client(config: dict[str, str]) -> SearchClient:
    """
    Erstellt einen SearchClient mit Service Principal Authentifizierung.
    """
    credential = ClientSecretCredential(
        tenant_id=config["tenant_id"],
        client_id=config["client_id"],
        client_secret=config["client_secret"],
    )

    return SearchClient(
        endpoint=config["search_endpoint"],
        index_name=config["index_name"],
        credential=credential,
    )


def erstelle_oeffentlicher_filter() -> str:
    """
    Erstellt einen Filter fuer nur oeffentliche Dokumente da wir den Index von Keiko nutzen.
    """
    # Filter fuer oeffentliche Dokumente:
    # - oids/any(o: o eq 'all'): Dokumente mit 'all' im oids-Feld
    # - (not oids/any(o: o ne null)): Dokumente mit leerem oids-Array
    return "(oids/any(o: o eq 'all') or (not oids/any(o: o ne null)))"


def suche_im_index(
        client: SearchClient,
        suchanfrage: str,
        top: int = 5,
) -> list[dict]:
    """
    Fuehrt eine Suche im Azure AI Search Index durch.
    """
    # Filter fuer oeffentliche Dokumente anwenden
    oeffentlicher_filter = erstelle_oeffentlicher_filter()

    ergebnisse = client.search(
        search_text=suchanfrage,
        filter=oeffentlicher_filter,
        top=top,
        include_total_count=True,
    )

    dokumente = []
    for dokument in ergebnisse:
        dokumente.append({
            "id": dokument.get("id", "N/A"),
            "content": dokument.get("content", "")[:500],  # Ersten 500 Zeichen
            "sourcepage": dokument.get("sourcepage", "N/A"),
            "sourcefile": dokument.get("sourcefile", "N/A"),
            "score": dokument.get("@search.score", 0),
        })

    return dokumente


def zeige_ergebnisse(dokumente: list[dict], suchanfrage: str) -> None:
    """
    Zeigt die Suchergebnisse
    """
    print(f"\n{'=' * 60}")
    print(f"Suchanfrage: {suchanfrage}")
    print(f"Gefundene Dokumente: {len(dokumente)}")
    print("=" * 60)

    if not dokumente:
        print("\nKeine Ergebnisse gefunden.")
        return

    for i, dok in enumerate(dokumente, 1):
        print(f"\n--- Ergebnis {i} (Score: {dok['score']:.4f}) ---")
        print(f"Quelle: {dok['sourcepage']}")
        print(f"Datei: {dok['sourcefile']}")
        print(f"Inhalt:\n{dok['content']}...")


def main() -> None:
    print("=" * 60)
    print("Azure AI Search Chat-Demo")
    print("Authentifizierung via Service Principal")
    print("=" * 60)

    try:
        config = lade_umgebungsvariablen()
        print(f"\nVerbinde mit: {config['search_endpoint']}")
        print(f"Index: {config['index_name']}")
    except SystemExit:
        return

    try:
        client = erstelle_search_client(config)
        print("Verbindung hergestellt.\n")
    except ClientAuthenticationError as e:
        print(f"\nFEHLER: Authentifizierung fehlgeschlagen: {e}")
        return

    print("Gib eine Frage ein (oder 'exit' zum Beenden):\n")

    while True:
        try:
            suchanfrage = input("Frage: ").strip()

            if suchanfrage.lower() in ("exit", "quit", "q", "beenden"):
                print("\nAuf Wiedersehen!")
                break

            if not suchanfrage:
                print("Bitte gib eine Frage ein.\n")
                continue

            dokumente = suche_im_index(client, suchanfrage)
            zeige_ergebnisse(dokumente, suchanfrage)
            print()

        except HttpResponseError as e:
            print(f"\nFEHLER bei der Suche: {e.message}")
        except KeyboardInterrupt:
            print("\n\nAbgebrochen.")
            break


if __name__ == "__main__":
    main()
