from setuptools import setup, find_packages

setup(
    name="memoism-backend",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi[all]",
        "uvicorn",
        "sqlmodel",
        "python-jose[cryptography]",
        "passlib[bcrypt]",
        "python-multipart",
        "psycopg2-binary",
    ],
) 