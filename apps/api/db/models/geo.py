from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.models.base import Base


class Country(Base):
    __tablename__ = "countries"

    code: Mapped[str] = mapped_column(String(2), primary_key=True)  # ISO 3166-1 alpha-2
    name: Mapped[str] = mapped_column(String, nullable=False)
    phone_prefix: Mapped[str | None] = mapped_column(String, nullable=True)
    default_currency_code: Mapped[str | None] = mapped_column(String(3), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    regions: Mapped[list["Region"]] = relationship("Region", back_populates="country")


class Region(Base):
    __tablename__ = "regions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    country_code: Mapped[str] = mapped_column(
        String(2), ForeignKey("countries.code", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "KGN", "AND"
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False, server_default="parish")  # parish, state, province
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    country: Mapped["Country"] = relationship("Country", back_populates="regions")


class Currency(Base):
    __tablename__ = "currencies"

    code: Mapped[str] = mapped_column(String(3), primary_key=True)  # ISO 4217
    name: Mapped[str] = mapped_column(String, nullable=False)
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    decimal_places: Mapped[int] = mapped_column(Integer, nullable=False, server_default="2")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
