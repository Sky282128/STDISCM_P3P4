from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Role(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    UNSPECIFIED: _ClassVar[Role]
    STUDENT: _ClassVar[Role]
    TEACHER: _ClassVar[Role]
UNSPECIFIED: Role
STUDENT: Role
TEACHER: Role

class AuthRequest(_message.Message):
    __slots__ = ("username", "password")
    USERNAME_FIELD_NUMBER: _ClassVar[int]
    PASSWORD_FIELD_NUMBER: _ClassVar[int]
    username: str
    password: str
    def __init__(self, username: _Optional[str] = ..., password: _Optional[str] = ...) -> None: ...

class RegisterRequest(_message.Message):
    __slots__ = ("username", "password", "role")
    USERNAME_FIELD_NUMBER: _ClassVar[int]
    PASSWORD_FIELD_NUMBER: _ClassVar[int]
    ROLE_FIELD_NUMBER: _ClassVar[int]
    username: str
    password: str
    role: Role
    def __init__(self, username: _Optional[str] = ..., password: _Optional[str] = ..., role: _Optional[_Union[Role, str]] = ...) -> None: ...

class AuthResult(_message.Message):
    __slots__ = ("authenticated", "role", "token", "message")
    AUTHENTICATED_FIELD_NUMBER: _ClassVar[int]
    ROLE_FIELD_NUMBER: _ClassVar[int]
    TOKEN_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    authenticated: bool
    role: Role
    token: str
    message: str
    def __init__(self, authenticated: _Optional[bool] = ..., role: _Optional[_Union[Role, str]] = ..., token: _Optional[str] = ..., message: _Optional[str] = ...) -> None: ...

class RegisterResult(_message.Message):
    __slots__ = ("success", "message")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    success: bool
    message: str
    def __init__(self, success: _Optional[bool] = ..., message: _Optional[str] = ...) -> None: ...
