"""Seed the database with realistic BC food industry demo data.

Run: source .venv/bin/activate && python scripts/seed_demo_data.py
To wipe first: python scripts/seed_demo_data.py --wipe
"""

import asyncio
import random
import sys
from datetime import datetime, timedelta
from uuid import uuid4

from app.config import settings
from app.models import (
    Infraction,
    InfractionSeverity,
    InfractionStatus,
    Supplier,
    SupplierStatus,
    User,
)
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# ── Realistic BC food industry suppliers ──────────────────────────────────
SUPPLIERS = [
    {"legal_name": "Metro Seafood Distribution Ltd", "dba": "Metro Seafood", "duns": "824419022", "facility_id": "REG-901244", "health_authority": "Fraser Health", "status": SupplierStatus.ACTIVE, "score": 88},
    {"legal_name": "Highland Farms Dairy Inc", "dba": "Highland Dairy", "duns": "732105698", "facility_id": "REG-450122", "health_authority": "VCH", "status": SupplierStatus.ACTIVE, "score": 94},
    {"legal_name": "Global Produce Partners Corp", "dba": "Global Produce", "duns": "615883307", "facility_id": "REG-784509", "health_authority": "Fraser Health", "status": SupplierStatus.FLAGGED, "score": 34},
    {"legal_name": "Pacific Northwest Bakeries Ltd", "dba": "PNW Bakery", "duns": "509112448", "facility_id": "REG-332771", "health_authority": "VCH", "status": SupplierStatus.ACTIVE, "score": 91},
    {"legal_name": "Island Fresh Poultry Inc", "dba": "Island Poultry", "duns": "287634901", "facility_id": "REG-560198", "health_authority": "Island Health", "status": SupplierStatus.MONITORED, "score": 62},
    {"legal_name": "Northern Cold Storage Ltd", "dba": "NC Storage", "duns": "443221890", "facility_id": "REG-215440", "health_authority": "Northern Health", "status": SupplierStatus.ACTIVE, "score": 79},
    {"legal_name": "Valley Greens Produce Co", "dba": "Valley Greens", "duns": "976543211", "facility_id": "REG-678234", "health_authority": "Fraser Health", "status": SupplierStatus.FLAGGED, "score": 28},
    {"legal_name": "Sunshine Coast Fisheries Corp", "dba": "Sunshine Fisheries", "duns": "358902176", "facility_id": "REG-803567", "health_authority": "VCH", "status": SupplierStatus.ACTIVE, "score": 86},
    {"legal_name": "Interior Meat Packers Ltd", "dba": "Interior Meats", "duns": "124567932", "facility_id": "REG-448900", "health_authority": "Interior Health", "status": SupplierStatus.ACTIVE, "score": 73},
    {"legal_name": "Coastal Beverage Distributors Inc", "dba": "Coastal Bev", "duns": "701248933", "facility_id": "REG-129877", "health_authority": "VCH", "status": SupplierStatus.MAPPED, "score": None},
    {"legal_name": "Fraser Canyon Organic Farms", "dba": "Fraser Organics", "duns": "865109432", "facility_id": "REG-556122", "health_authority": "Fraser Health", "status": SupplierStatus.ACTIVE, "score": 96},
    {"legal_name": "Richmond Food Importers Ltd", "dba": "Richmond Imports", "duns": "192384756", "facility_id": "REG-334098", "health_authority": "VCH", "status": SupplierStatus.MONITORED, "score": 58},
    {"legal_name": "Okanagan Fruit Packers Co", "dba": "Okanagan Fruit", "duns": "543210987", "facility_id": "REG-712345", "health_authority": "Interior Health", "status": SupplierStatus.ACTIVE, "score": 82},
    {"legal_name": "Portside Processing Ltd", "dba": "Portside", "duns": "876543210", "facility_id": "REG-250887", "health_authority": "Island Health", "status": SupplierStatus.FLAGGED, "score": 41},
    {"legal_name": "Burnaby Bakery Supply Corp", "dba": "Burnaby Bakery", "duns": "321654987", "facility_id": "REG-998100", "health_authority": "Fraser Health", "status": SupplierStatus.ACTIVE, "score": 77},
    {"legal_name": "Victoria Specialty Foods Inc", "dba": "Victoria Specialty", "duns": "654987321", "facility_id": "REG-423876", "health_authority": "Island Health", "status": SupplierStatus.ACTIVE, "score": 90},
    {"legal_name": "Surrey Spice Traders Ltd", "dba": "Surrey Spices", "duns": "456123789", "facility_id": "REG-567234", "health_authority": "Fraser Health", "status": SupplierStatus.MAPPED, "score": None},
    {"legal_name": "Prince George Provisions Co", "dba": "PG Provisions", "duns": "789456123", "facility_id": "REG-310556", "health_authority": "Northern Health", "status": SupplierStatus.IMPORTED, "score": None},
    {"legal_name": "Abbotsford Dairy Supply Ltd", "dba": "Abbotsford Dairy", "duns": "213546879", "facility_id": "REG-678901", "health_authority": "Fraser Health", "status": SupplierStatus.ACTIVE, "score": 85},
    {"legal_name": "Whistler Gourmet Distributors", "dba": "Whistler Gourmet", "duns": "987123654", "facility_id": "REG-189345", "health_authority": "VCH", "status": SupplierStatus.ACTIVE, "score": 93},
    {"legal_name": "Kelowna Cold Chain Logistics", "dba": "Kelowna Cold Chain", "duns": "567890234", "facility_id": "REG-498233", "health_authority": "Interior Health", "status": SupplierStatus.MONITORED, "score": 66},
    {"legal_name": "Delta Fresh Catch Inc", "dba": "Delta Catch", "duns": "345678901", "facility_id": "REG-775100", "health_authority": "Fraser Health", "status": SupplierStatus.ACTIVE, "score": 81},
    {"legal_name": "Nanaimo Natural Foods Ltd", "dba": "Nanaimo Naturals", "duns": "112233445", "facility_id": "REG-346211", "health_authority": "Island Health", "status": SupplierStatus.IMPORTED, "score": None},
]

# ── Infraction generation ────────────────────────────────────────────────
CRITICAL_INFRACTIONS = [
    ("Temperature Control Deviation", "Cold storage unit #4B failed audit. Product temperature at 12°C vs required 4°C."),
    ("Pest Infestation Evidence", "Rodent droppings found in dry storage area. Facility ordered to deep clean."),
    ("Pathogen Alert (Listeria)", "Routine swab returned positive for Listeria monocytogenes on processing line 3."),
    ("Unsanitary Surfaces", "Processing area B surfaces failed ATP swab tests. Immediate sanitation required."),
    ("Foreign Object Contamination", "Metal fragment found in packaged product. Voluntary recall issued for batch #342."),
    ("Closure Order Issued", "Facility ordered to cease operations pending re-inspection by health authority."),
]

MODERATE_INFRACTIONS = [
    ("Labeling Inaccuracy (Net Weight)", "Product labels understated actual weight by 8%. Correction protocol issued."),
    ("Record Keeping Deficiency", "HACCP monitoring logs missing for 6 consecutive days in Q2."),
    ("Employee Hygiene Violation", "Staff observed not following hand-washing protocol at processing station."),
    ("Equipment Maintenance Gap", "Monthly calibration records for thermometer #12 not on file."),
    ("Waste Management Irregularity", "Organic waste not disposed of within required 24-hour window."),
    ("Allergen Cross-Contact Risk", "Shared equipment used for nut and non-nut products without documented cleaning."),
]

NON_CRITICAL_INFRACTIONS = [
    ("Minor Labeling Inaccuracy", "Ingredient list font size below regulatory minimum on retail packaging."),
    ("Documentation Format Error", "Inspection report uses outdated form version. Administrative correction filed."),
    ("Floor Surface Wear", "Epoxy flooring showing minor wear in receiving bay. No contamination risk."),
    ("Lighting Insufficiency", "Two light fixtures non-operational in walk-in cooler. Replacement scheduled."),
    ("Water Temperature Deviation", "Hand-wash sink temperature at 35°C instead of required 38°C at time of check."),
    ("Signage Non-Compliance", "Allergen warning sign missing from prep station #2. Replacement posted same day."),
]

SOURCES = ["Fraser Health", "VCH", "Interior Health", "Island Health"]

def random_date(days_back: int = 730) -> datetime:
    return datetime.utcnow() - timedelta(days=random.randint(0, days_back))

def generate_infractions(supplier_id, count: int, bias: str = "mixed"):
    """Generate count infractions for a supplier. bias = 'critical', 'moderate', 'clean', or 'mixed'."""
    infractions = []
    for _ in range(count):
        if bias == "critical":
            pool = random.choices([CRITICAL_INFRACTIONS, MODERATE_INFRACTIONS, NON_CRITICAL_INFRACTIONS], weights=[7, 2, 1])[0]
        elif bias == "moderate":
            pool = random.choices([CRITICAL_INFRACTIONS, MODERATE_INFRACTIONS, NON_CRITICAL_INFRACTIONS], weights=[1, 6, 3])[0]
        elif bias == "clean":
            pool = random.choices([CRITICAL_INFRACTIONS, MODERATE_INFRACTIONS, NON_CRITICAL_INFRACTIONS], weights=[0, 2, 8])[0]
        else:
            pool = random.choices([CRITICAL_INFRACTIONS, MODERATE_INFRACTIONS, NON_CRITICAL_INFRACTIONS], weights=[3, 4, 3])[0]

        inf_type, description = random.choice(pool)

        # Severity from pool type
        if pool is CRITICAL_INFRACTIONS:
            severity = InfractionSeverity.CRITICAL
        elif pool is MODERATE_INFRACTIONS:
            severity = InfractionSeverity.MODERATE
        else:
            severity = InfractionSeverity.NON_CRITICAL

        status = random.choices(
            [InfractionStatus.RESOLVED, InfractionStatus.PENDING_REVIEW, InfractionStatus.ACTIVE],
            weights=[5, 3, 2],
        )[0]

        actions = {
            InfractionStatus.RESOLVED: ["Deep cleaning completed", "Batch quarantined and released", "Corrective action verified", "Staff retrained"],
            InfractionStatus.PENDING_REVIEW: ["Awaiting lab results", "Re-inspection scheduled", "Corrective plan submitted", "Investigation ongoing"],
            InfractionStatus.ACTIVE: ["Quarantine in effect", "Cease and desist issued", "Recall in progress", "Court order pending"],
        }

        infractions.append(Infraction(
            id=uuid4(),
            supplier_id=supplier_id,
            source=random.choice(SOURCES),
            infraction_type=inf_type,
            description=description,
            severity=severity,
            status=status,
            action_taken=random.choice(actions[status]),
            reported_date=random_date(730),
        ))
    return infractions


async def seed(wipe: bool = False):
    engine = create_async_engine(settings.database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        if wipe:
            await db.execute(delete(Infraction))
            await db.execute(delete(Supplier))
            await db.commit()
            print("Wiped existing suppliers and infractions.")

        # Get or create user
        result = await db.execute(select(User).limit(1))
        user = result.scalar()
        if not user:
            user = User(id=uuid4(), email="demo@tavera.dev", organization_name="The Bistro Group")
            db.add(user)
            await db.flush()
            print(f"Created demo user: {user.email}")

        created = 0
        total_infractions = 0

        for entry in SUPPLIERS:
            # Check if supplier already exists by legal_name
            result = await db.execute(select(Supplier).where(Supplier.legal_name == entry["legal_name"]))
            if result.scalar():
                continue

            supplier = Supplier(
                id=uuid4(),
                user_id=user.id,
                legal_name=entry["legal_name"],
                dba=entry["dba"],
                duns=entry["duns"],
                facility_id=entry["facility_id"],
                health_authority=entry["health_authority"],
                status=entry["status"],
                unified_score=entry["score"],
                score_sources_available=random.randint(1, 3) if entry["score"] else 0,
                score_sources_total=3,
                score_last_updated=datetime.utcnow() - timedelta(hours=random.randint(1, 48)) if entry["score"] else None,
                registered_entity=f"{random.randint(100000, 999999)} BC Ltd.",
                address=f"{random.randint(100, 9999)} {random.choice(['Industrial Way', 'Commercial Dr', 'Production Blvd', 'Harbour Rd', 'Fraser Hwy'])}, {entry['health_authority'].split()[0]}",
            )
            db.add(supplier)
            await db.flush()
            created += 1

            # Generate infractions based on status
            if entry["status"] == SupplierStatus.FLAGGED:
                infs = generate_infractions(supplier.id, random.randint(8, 14), bias="critical")
            elif entry["status"] == SupplierStatus.MONITORED:
                infs = generate_infractions(supplier.id, random.randint(3, 7), bias="moderate")
            elif entry["score"] and entry["score"] < 70:
                infs = generate_infractions(supplier.id, random.randint(2, 5), bias="moderate")
            else:
                infs = generate_infractions(supplier.id, random.randint(0, 3), bias="clean")

            for inf in infs:
                db.add(inf)
                total_infractions += 1

        await db.commit()
        print(f"Created {created} suppliers with {total_infractions} infractions.")

    await engine.dispose()


if __name__ == "__main__":
    wipe = "--wipe" in sys.argv
    asyncio.run(seed(wipe=wipe))
