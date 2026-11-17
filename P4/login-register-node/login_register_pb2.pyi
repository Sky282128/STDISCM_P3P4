from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Role(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    UNSPECIFIED: _ClassVar[Role]
    Student: _ClassVar[Role]
    Teacher: _ClassVar[Role]
UNSPECIFIED: Role
Student: Role
Teacher: Role

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

class Result(_message.Message):
    __slots__ = ("authenticated",)
    AUTHENTICATED_FIELD_NUMBER: _ClassVar[int]
    authenticated: bool
    def __init__(self, authenticated: _Optional[bool] = ...) -> None: ...
