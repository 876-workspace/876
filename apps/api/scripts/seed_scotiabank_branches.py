"""
Seed Scotiabank Jamaica branches.
"""
import asyncio
import os
import sys
import time
import urllib.request

from bs4 import BeautifulSoup

_api_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _api_root)

from dotenv import load_dotenv
load_dotenv(os.path.join(_api_root, ".env.development"), override=False)
load_dotenv(os.path.join(_api_root, ".env"), override=False)

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select, text
from core.config import get_settings
from db.repositories.directory import generate_id
from db.models.directory import Bank, BankBranch, DirectoryAddress

from db.session import _make_engine

URL = "https://jm.scotiabank.com/about-scotiabank/connect-with-scotiabank/branch-locations.html"

async def seed_scotiabank():
    settings = get_settings()
    engine = _make_engine(settings.database_url)
    
    async with AsyncSession(engine) as session:
        # Check if Bank exists
        stmt = select(Bank).where(Bank.bank_code == "002")
        result = await session.execute(stmt)
        bank = result.scalar_one_or_none()
        
        now = int(time.time())
        if bank:
            bank_id = bank.id
        else:
            print("Creating Scotiabank record...")
            bank_id = generate_id("bank")
            bank = Bank(
                id=bank_id,
                name="The Bank of Nova Scotia Jamaica Ltd",
                short_name="Scotiabank",
                bank_code="002",
                swift_code="NOSCJMKN",
                created_at=now,
                updated_at=now
            )
            session.add(bank)
            await session.commit()
            
        print("Fetching branch data...")
        req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req).read().decode("utf-8")
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table")
        
        branches_added = 0
        if table:
            # First row is usually header, so we skip index 0 if it contains 'Branch'
            rows = table.find_all("tr")
            for i, row in enumerate(rows):
                cells = row.find_all(["th", "td"])
                if len(cells) < 2:
                    continue
                branch_name = cells[0].text.strip()
                if branch_name.lower() == "branch":
                    continue
                
                address_text = cells[1].text.strip()
                email = cells[2].text.strip() if len(cells) > 2 else None
                
                # Check if branch exists
                stmt = select(BankBranch).where(BankBranch.name == branch_name, BankBranch.bank_id == bank_id)
                existing = await session.execute(stmt)
                if existing.scalar_one_or_none():
                    continue
                
                # Generate mock transit number based on index for now, as it's required
                transit_number = f"99{str(i).zfill(3)}"
                
                # Parse address
                addr_lines = [line.strip() for line in address_text.split("\n") if line.strip()]
                line1 = addr_lines[0] if len(addr_lines) > 0 else branch_name
                state = addr_lines[-1] if len(addr_lines) > 1 else "Kingston"
                city = branch_name
                
                print(f"Adding branch: {branch_name}")
                address = DirectoryAddress(
                    id=generate_id("directory_address"),
                    line1=line1,
                    city=city,
                    state=state,
                    country="JM",
                    latitude=18.0,
                    longitude=-77.0,
                    created_at=now,
                    updated_at=now
                )
                session.add(address)
                await session.flush()
                
                branch = BankBranch(
                    id=generate_id("bank_branch"),
                    bank_id=bank_id,
                    name=branch_name,
                    transit_number=transit_number,
                    address_id=address.id,
                    created_at=now,
                    updated_at=now
                )
                session.add(branch)
                branches_added += 1
                
        await session.commit()
        print(f"Seeded {branches_added} new branches.")

if __name__ == "__main__":
    asyncio.run(seed_scotiabank())
