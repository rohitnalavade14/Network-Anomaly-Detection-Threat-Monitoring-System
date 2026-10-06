from getpass import getpass

try:
    from backend.database import SessionLocal
    from backend.db_models import User
    from backend.auth import hash_password
except ModuleNotFoundError:
    from database import SessionLocal
    from db_models import User
    from auth import hash_password


def create_admin():

    email = input("Enter admin email: ").strip().lower()
    password = getpass("Enter admin password: ")

    if not email:
        print("Email cannot be empty.")
        return

    if not password:
        print("Password cannot be empty.")
        return

    db = SessionLocal()

    try:

        user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if user:

            user.role = "admin"
            user.password_hash = hash_password(password)

            db.commit()

            print("\nExisting user updated.")
            print("Email:", user.email)
            print("Role:", user.role)

        else:

            new_admin = User(
                email=email,
                password_hash=hash_password(password),
                role="admin"
            )

            db.add(new_admin)
            db.commit()
            db.refresh(new_admin)

            print("\nAdmin user created.")
            print("ID:", new_admin.id)
            print("Email:", new_admin.email)
            print("Role:", new_admin.role)

    except Exception as e:

        db.rollback()
        print("\nError:", e)

    finally:

        db.close()


if __name__ == "__main__":
    create_admin()