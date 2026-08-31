This folder holds trained model artifacts and is intentionally empty
in version control (add *.pkl and the two *.json files here to
.gitignore). Run `python ml/train_model.py <path-to-csv>` to populate
it — see ml/train_model.py's docstring for the expected CSV format.

Until this folder has delay_model.pkl in it, the backend automatically
falls back to placeholder delay predictions (see app/services/eta.py).
