from dynaconf import Dynaconf
# from pathlib import Path

# BASE_DIR = Path(__file__).resolve().parents[2]

settings = Dynaconf(
    envvar_prefix="FILMY",
    settings_files=[
        "config/settings.dev.yaml",
        "config/settings.prod.yaml"
    ],
    environments=True,
    load_dotenv=True,
    env_switcher="ENV_FOR_DYNACONF"
)