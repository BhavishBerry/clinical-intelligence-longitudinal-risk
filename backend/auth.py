"""
Authentication Module - Clinical Intelligence Platform
=======================================================
JWT-based authentication with role-based access control.
"""

import os
from typing import Optional, List
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# Configuration - Use environment variable in production
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-only-fallback-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security = HTTPBearer(auto_error=False)


# =============================================================================
# TOKEN MODELS
# =============================================================================

class TokenData(BaseModel):
    user_id: str
    email: str
    role: str
    name: Optional[str] = None
    exp: Optional[datetime] = None


# =============================================================================
# TOKEN FUNCTIONS
# =============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


# =============================================================================
# TASK-6.1: JWT VALIDATION MIDDLEWARE
# =============================================================================

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    Verify JWT token and return decoded payload.
    Raises 401 if token is invalid or missing.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenData(
            user_id=payload.get("user_id", payload.get("sub")),
            email=payload.get("email", ""),
            role=payload.get("role", "user"),
            name=payload.get("name"),
            exp=datetime.fromtimestamp(payload.get("exp", 0)),
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[TokenData]:
    """
    Get user from token if present, otherwise return None.
    Useful for routes that work differently for authenticated vs anonymous users.
    """
    if credentials is None:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenData(
            user_id=payload.get("user_id", payload.get("sub")),
            email=payload.get("email", ""),
            role=payload.get("role", "user"),
            name=payload.get("name"),
            exp=datetime.fromtimestamp(payload.get("exp", 0)),
        )
    except JWTError:
        return None


# =============================================================================
# TASK-6.3: ROLE-BASED ACCESS CONTROL
# =============================================================================

def require_role(*allowed_roles: str):
    """
    Dependency factory that checks if user has one of the allowed roles.
    Usage: Depends(require_role("admin", "doctor"))
    """
    def role_checker(user: TokenData = Depends(verify_token)) -> TokenData:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {' or '.join(allowed_roles)}",
            )
        return user
    return role_checker


# Role-specific dependencies for common use cases
require_admin = require_role("admin")
require_doctor = require_role("admin", "doctor")
require_nurse = require_role("admin", "doctor", "nurse")
require_any_authenticated = verify_token


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_current_user_id(user: TokenData = Depends(verify_token)) -> str:
    """Extract just the user ID from the token."""
    return user.user_id
